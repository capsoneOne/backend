"""
The real encoder: OpenAI CLIP ViT-B/32 via `transformers`.

Select with `EMBEDDER_MODEL=clip` (see model_registry.py). This is the first
implementation in this service that carries actual semantic meaning — the stub
(`model.py`) hashes bytes, and the simulator (`model_sim.py`) only understands
colour and coarse structure.

Contract obligations this file is responsible for, all of which the test suite
asserts (docs/embedding-service-contract.md §3):

  * 512-d, L2-normalized, finite vectors. CLIP ViT-B/32's projection dim is 512,
    which is why the DB column and EMBEDDING_DIM already agree — do not swap in a
    ViT-L (768) or ViT-B/16-plus variant without a migration.
  * Deterministic and batch-independent. Guaranteed by eval mode, inference_mode,
    float32, and fixed-length text padding (see _embed_text_batch).
  * All preprocessing lives here, never in the backend, so the index path and the
    query path cannot drift apart (§3.7).

Weights are ~600 MB and are downloaded on first load into HF_HOME, which the
compose file maps to a named volume. A container recreate must not re-download.
"""

from __future__ import annotations

import io
import logging
import os
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageOps, UnidentifiedImageError
from transformers import CLIPImageProcessor, CLIPModel, CLIPTokenizerFast

logger = logging.getLogger("embedder")

# --- Declared identity -------------------------------------------------------
# REVISION must change whenever anything that could alter a vector changes:
# weights, architecture, preprocessing, normalization, or a library version that
# affects numerics. A stale REVISION silently corrupts the index — contract §4.
#
# The date suffix is the day this implementation landed, and the trailing counter
# exists so a preprocessing fix on the same day is still a distinct revision.

MODEL_ID = "openai/clip-vit-base-patch32"
EMBEDDING_DIM = 512
REVISION = "clip-vit-b32-2026-08-14.1"
SHARED_SPACE = True
MODALITIES = ["image", "text"]

# CLIP's text encoder has a hard 77-token context, including the BOS/EOS tokens.
# Longer text is truncated rather than rejected: a product query that runs long is
# still a usable query, whereas an error would fail the whole search.
TEXT_CONTEXT_LENGTH = 77

# cpu by default because that is what the deployment target is (a free Hugging Face
# Space, 2 vCPU). Override for a GPU box; the vectors are the same either way to
# well within the contract's 1e-4 determinism tolerance.
DEVICE = torch.device(os.getenv("EMBEDDER_DEVICE", "cpu"))

_model: CLIPModel | None = None
_image_processor: CLIPImageProcessor | None = None
_tokenizer: CLIPTokenizerFast | None = None


class EmbeddingError(Exception):
    """A per-item failure. Yields `vector: null` plus this code for that item only,
    leaving the rest of the batch unaffected (contract §3.6)."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def load_model() -> None:
    """Load weights and warm up. Raising here aborts startup, which is correct —
    /health must not report ok for a service that cannot embed.

    The warm-up is not decoration. The first forward pass through a freshly loaded
    torch model allocates buffers and resolves kernels, and costs several seconds;
    paying that here means the first real request does not.
    """
    global _model, _image_processor, _tokenizer

    threads = os.getenv("TORCH_NUM_THREADS")
    if threads:
        torch.set_num_threads(int(threads))

    logger.info("loading %s onto %s", MODEL_ID, DEVICE)
    _image_processor = CLIPImageProcessor.from_pretrained(MODEL_ID)
    _tokenizer = CLIPTokenizerFast.from_pretrained(MODEL_ID)
    _model = CLIPModel.from_pretrained(MODEL_ID, torch_dtype=torch.float32)
    _model.to(DEVICE)
    _model.eval()

    projection_dim = int(_model.config.projection_dim)
    if projection_dim != EMBEDDING_DIM:
        # Louder than a wrong-length vector escaping into the database, where it
        # would fail on insert with a message that names Postgres, not the model.
        raise RuntimeError(
            f"{MODEL_ID} has projection_dim={projection_dim}, but this service "
            f"declares EMBEDDING_DIM={EMBEDDING_DIM}. Update both, the DB column "
            f"and REVISION together."
        )

    _embed_image_batch([preprocess_image(_blank_png())])
    _embed_text_batch([preprocess_text("warm up")])
    logger.info("model ready, dim=%d, revision=%s", EMBEDDING_DIM, REVISION)


def preprocess_image(raw: bytes) -> Any:
    """Decode one image and turn it into a CLIP pixel tensor.

    EXIF transpose and RGB conversion happen here for the same reason the whole
    function does: the backend sends original file bytes, so this is the only place
    the index path and the query path can be guaranteed to agree (contract §3.7,
    ds-handoff §4.3/§4.4).
    """
    if not raw:
        raise EmbeddingError("EMPTY_INPUT", "image payload was empty")
    if _image_processor is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except UnidentifiedImageError as exc:
        raise EmbeddingError("DECODE_FAILED", "cannot identify image file") from exc
    except Exception as exc:  # truncated files, decompression bombs, bad palettes
        raise EmbeddingError("DECODE_FAILED", f"failed to decode image: {exc}") from exc

    # Phone photos carry a rotation tag that decoders handle inconsistently. An
    # image rotated 90 degrees relative to how it was indexed embeds to a badly
    # wrong vector — and nothing anywhere reports an error.
    img = ImageOps.exif_transpose(img)

    # Uploads arrive as RGBA screenshots, greyscale scans, palette PNGs and
    # occasionally CMYK. CLIP's processor expects 3 channels.
    if img.mode != "RGB":
        img = img.convert("RGB")

    try:
        # Resize to 224, centre-crop, rescale, normalize with CLIP's own mean/std.
        # Using the shipped processor rather than hand-rolling this is deliberate:
        # the normalization constants are part of the weights' contract, and
        # getting them subtly wrong degrades recall without failing anything.
        pixel_values = _image_processor(images=img, return_tensors="pt")["pixel_values"]
    except Exception as exc:
        raise EmbeddingError("DECODE_FAILED", f"failed to preprocess image: {exc}") from exc

    return pixel_values[0]


def preprocess_text(text: str) -> Any:
    """Tokenize one query to CLIP's fixed 77-token context."""
    cleaned = text.strip()
    if not cleaned:
        raise EmbeddingError("EMPTY_INPUT", "text was empty after trimming")
    if _tokenizer is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    # padding="max_length" rather than padding=True. Padding to the longest item in
    # the batch would make a vector depend on what else was in the batch, which the
    # contract forbids (§3.4) and the test suite checks. Padding every input to the
    # full 77 tokens is also exactly what OpenAI's reference implementation does.
    encoded = _tokenizer(
        cleaned,
        padding="max_length",
        max_length=TEXT_CONTEXT_LENGTH,
        truncation=True,
        return_tensors="pt",
    )
    return {
        "input_ids": encoded["input_ids"][0],
        "attention_mask": encoded["attention_mask"][0],
    }


def _embed_image_batch(prepared: list[Any]) -> list[list[float]]:
    """Forward pass over preprocessed images.

    ViT has no cross-sample operations — no batch norm, no shared statistics — so
    stacking inputs is a pure throughput optimization and cannot change a vector.
    """
    if _model is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    pixel_values = torch.stack(prepared).to(DEVICE)
    with torch.inference_mode():
        features = _model.get_image_features(pixel_values=pixel_values)
    return _l2_normalize_rows(features)


def _embed_text_batch(prepared: list[Any]) -> list[list[float]]:
    """Forward pass over tokenized text. Same guarantees as the image path."""
    if _model is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    input_ids = torch.stack([p["input_ids"] for p in prepared]).to(DEVICE)
    attention_mask = torch.stack([p["attention_mask"] for p in prepared]).to(DEVICE)
    with torch.inference_mode():
        features = _model.get_text_features(input_ids=input_ids, attention_mask=attention_mask)
    return _l2_normalize_rows(features)


def _l2_normalize_rows(features: torch.Tensor) -> list[list[float]]:
    """Normalize inside the service so cosine reduces to an inner product, and the
    backend never has to remember to do it on one of the two paths (contract §3.1).

    Done in float64 on the numpy side rather than with torch.nn.functional.normalize:
    float32 division leaves the norm off 1.0 by ~1e-7 per element, which accumulates
    across 512 dimensions and can land outside the 1e-5 tolerance main.py enforces.
    """
    arr = features.detach().to(torch.float32).cpu().numpy().astype(np.float64)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    if not np.all(np.isfinite(norms)) or np.any(norms == 0.0):
        raise EmbeddingError("INFERENCE_FAILED", "model produced a degenerate vector")
    return (arr / norms).tolist()


def _blank_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (224, 224), (127, 127, 127)).save(buf, format="PNG")
    return buf.getvalue()
