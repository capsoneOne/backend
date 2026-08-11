"""HTTP layer for the embedding service.

Implements docs/embedding-service-contract.md. This file is model-agnostic — it
owns routing, validation, batching and error shaping, and should not need to change
when the model behind `model.py` is replaced.
"""

from __future__ import annotations

import base64
import binascii
import logging
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .model_registry import active as m

logger = logging.getLogger("embedder")

MAX_BATCH_ITEMS = 32
MAX_REQUEST_BYTES = 32 * 1024 * 1024
NORM_TOLERANCE = 1e-5

_ready = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model before reporting ready. /health stays non-200 until this
    completes, so orchestration never routes traffic to a cold service."""
    global _ready
    logger.info("loading model %s (revision %s)", m.MODEL_ID, m.REVISION)
    m.load_model()
    _ready = True
    logger.info("model ready, dim=%d", m.EMBEDDING_DIM)
    yield


app = FastAPI(title="Visual Search Embedder", version="1.0", lifespan=lifespan)


# --- Schemas -----------------------------------------------------------------


class ImageItem(BaseModel):
    id: str
    data: str = Field(description="base64-encoded raw image bytes")


class TextItem(BaseModel):
    id: str
    text: str


class ImageRequest(BaseModel):
    items: list[ImageItem]


class TextRequest(BaseModel):
    items: list[TextItem]


# --- Middleware --------------------------------------------------------------


@app.middleware("http")
async def enforce_body_limit(request: Request, call_next):
    declared = request.headers.get("content-length")
    if declared is not None and int(declared) > MAX_REQUEST_BYTES:
        return JSONResponse(
            status_code=413,
            content={"detail": f"request body exceeds {MAX_REQUEST_BYTES} bytes"},
        )
    return await call_next(request)


# --- Routes ------------------------------------------------------------------


@app.get("/health")
def health() -> JSONResponse:
    body = {
        "status": "ok" if _ready else "loading",
        "model_id": m.MODEL_ID,
        "embedding_dim": m.EMBEDDING_DIM,
        "revision": m.REVISION,
        "normalized": True,
        "modalities": m.MODALITIES,
        "shared_space": m.SHARED_SPACE,
    }
    return JSONResponse(status_code=200 if _ready else 503, content=body)


@app.post("/embed/images")
def embed_images(req: ImageRequest) -> JSONResponse:
    if "image" not in m.MODALITIES:
        return _unsupported("image")
    if (err := _validate_batch(req.items)) is not None:
        return err
    return _run_batch(req.items, _prepare_image, m._embed_image_batch)


@app.post("/embed/text")
def embed_text(req: TextRequest) -> JSONResponse:
    if "text" not in m.MODALITIES:
        return _unsupported("text")
    if (err := _validate_batch(req.items)) is not None:
        return err
    return _run_batch(req.items, _prepare_text, m._embed_text_batch)


# --- Batch execution ---------------------------------------------------------


def _run_batch(items, prepare, embed_batch) -> JSONResponse:
    """Preprocess each item independently, embed the survivors as one batch, then
    stitch results back into request order.

    Per-item failures are isolated: a corrupt file yields an error for that item
    only and the rest of the batch still returns (contract §3.6).
    """
    results: list[dict] = [None] * len(items)  # type: ignore[list-item]
    prepared: list = []
    prepared_indices: list[int] = []

    for i, item in enumerate(items):
        try:
            prepared.append(prepare(item))
            prepared_indices.append(i)
        except m.EmbeddingError as exc:
            results[i] = _failure(item.id, exc.code, exc.message)

    if prepared:
        try:
            vectors = embed_batch(prepared)
        except m.EmbeddingError as exc:
            for i in prepared_indices:
                results[i] = _failure(items[i].id, exc.code, exc.message)
            vectors = []
        except Exception as exc:
            logger.exception("batch inference failed")
            for i in prepared_indices:
                results[i] = _failure(items[i].id, "INFERENCE_FAILED", str(exc))
            vectors = []

        if vectors:
            if len(vectors) != len(prepared):
                logger.error(
                    "model returned %d vectors for %d inputs", len(vectors), len(prepared)
                )
                for i in prepared_indices:
                    results[i] = _failure(
                        items[i].id, "INFERENCE_FAILED", "batch size mismatch from model"
                    )
            else:
                for idx, vector in zip(prepared_indices, vectors):
                    results[idx] = _checked(items[idx].id, vector)

    return JSONResponse(
        status_code=200,
        content={
            "model_id": m.MODEL_ID,
            "embedding_dim": m.EMBEDDING_DIM,
            "revision": m.REVISION,
            "results": results,
        },
    )


def _checked(item_id: str, vector) -> dict:
    """Verify a vector against the contract before it leaves the service.

    This turns a silent modelling mistake into a loud, correctly-attributed error.
    A wrong-dimension or unnormalized vector that reaches the database produces
    distances that are arithmetically valid and semantically meaningless, with no
    error anywhere — far more expensive to diagnose than a failure here.
    """
    arr = np.asarray(vector, dtype=float)

    if arr.ndim != 1 or arr.shape[0] != m.EMBEDDING_DIM:
        return _failure(
            item_id,
            "INFERENCE_FAILED",
            f"expected a vector of length {m.EMBEDDING_DIM}, got shape {arr.shape}",
        )
    if not np.all(np.isfinite(arr)):
        return _failure(item_id, "INFERENCE_FAILED", "vector contains NaN or Infinity")

    norm = float(np.linalg.norm(arr))
    if abs(norm - 1.0) > NORM_TOLERANCE:
        return _failure(
            item_id,
            "INFERENCE_FAILED",
            f"vector is not L2-normalized (norm={norm:.6f}); normalize inside the model",
        )

    return {"id": item_id, "vector": arr.tolist(), "error": None}


# --- Helpers -----------------------------------------------------------------


def _prepare_image(item: ImageItem):
    try:
        raw = base64.b64decode(item.data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise m.EmbeddingError("DECODE_FAILED", f"invalid base64: {exc}") from exc
    return m.preprocess_image(raw)


def _prepare_text(item: TextItem):
    return m.preprocess_text(item.text)


def _validate_batch(items: list) -> JSONResponse | None:
    """Request-level problems are 4xx; item-level problems are per-item errors."""
    if not items:
        return JSONResponse(status_code=400, content={"detail": "items must not be empty"})
    if len(items) > MAX_BATCH_ITEMS:
        return JSONResponse(
            status_code=400,
            content={"detail": f"batch exceeds {MAX_BATCH_ITEMS} items"},
        )
    seen = set()
    for item in items:
        if item.id in seen:
            return JSONResponse(
                status_code=400, content={"detail": f"duplicate item id: {item.id}"}
            )
        seen.add(item.id)
    return None


def _unsupported(modality: str) -> JSONResponse:
    return JSONResponse(
        status_code=501,
        content={"detail": f"this model does not support the '{modality}' modality"},
    )


def _failure(item_id: str, code: str, message: str) -> dict:
    return {"id": item_id, "vector": None, "error": {"code": code, "message": message}}
