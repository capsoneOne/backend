"""
The modelling seam.

Everything the modelling side owns lives in this file. The HTTP layer in `main.py`
handles routing, validation, batching and error shaping, and does not need to change
when the model changes.

To replace the stub:
  1. Set the four constants below.
  2. Implement load_model(), preprocess_image(), preprocess_text(),
     _embed_image_batch(), _embed_text_batch().
  3. Add dependencies to ../requirements.txt.
  4. Run `python -m pytest tests/` — it asserts every contract invariant.

See docs/embedding-service-contract.md for the binding interface and
docs/ds-handoff.md for context and known traps.
"""

from __future__ import annotations

import hashlib
import io
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

# --- Declared identity -------------------------------------------------------
# These are reported verbatim on /health and stamped onto every stored vector.
# REVISION must change whenever anything that could alter a vector changes:
# weights, architecture, preprocessing, normalization, or a library version that
# affects numerics. A stale REVISION silently corrupts the index — see contract §4.

MODEL_ID = "stub-deterministic-v0"
EMBEDDING_DIM = 512
REVISION = "stub-v0"
SHARED_SPACE = True
MODALITIES = ["image", "text"]


class EmbeddingError(Exception):
    """A per-item failure. Yields `vector: null` plus this code for that item only,
    leaving the rest of the batch unaffected (contract §3.6)."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def load_model() -> None:
    """Called once at startup, before /health reports ok.

    Load weights and run a warm-up inference here. Raising aborts startup, which is
    the correct behaviour — a service that cannot embed must not report ready.
    """
    # Stub: nothing to load. A real implementation loads weights and warms up, e.g.
    #   _embed_image_batch([preprocess_image(_BLANK_JPEG)])
    return None


def preprocess_image(raw: bytes) -> Any:
    """Decode and preprocess one image. Raises EmbeddingError on bad input.

    Preprocessing lives here, not in the backend, so the index path and the query
    path cannot drift apart (contract §3.7). Resize, crop, colour conversion and
    normalization all belong in this function.
    """
    if not raw:
        raise EmbeddingError("EMPTY_INPUT", "image payload was empty")

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except UnidentifiedImageError as exc:
        raise EmbeddingError("DECODE_FAILED", "cannot identify image file") from exc
    except Exception as exc:  # truncated files, decompression bombs, bad palettes
        raise EmbeddingError("DECODE_FAILED", f"failed to decode image: {exc}") from exc

    # Apply EXIF orientation explicitly. Phone photos carry a rotation tag that
    # decoders handle inconsistently; an image rotated 90° relative to how it was
    # indexed embeds to a badly wrong vector. See ds-handoff.md §4.3.
    img = ImageOps.exif_transpose(img)

    # Normalize colour mode. Uploads arrive as RGBA screenshots, greyscale scans,
    # palette PNGs and occasionally CMYK. See ds-handoff.md §4.4.
    if img.mode != "RGB":
        img = img.convert("RGB")

    # A real implementation resizes/crops and returns a tensor here. The stub keeps
    # the decoded image so the pipeline shape matches the real thing.
    return img


def preprocess_text(text: str) -> Any:
    """Tokenize/prepare one text input. Raises EmbeddingError on bad input.

    Note for the real implementation: CLIP's text encoder truncates at 77 tokens.
    Decide deliberately what gets sent and what gets dropped.
    """
    cleaned = text.strip()
    if not cleaned:
        raise EmbeddingError("EMPTY_INPUT", "text was empty after trimming")
    return cleaned


def _embed_image_batch(prepared: list[Any]) -> list[list[float]]:
    """Forward pass over a batch of preprocessed images.

    Must return L2-normalized vectors of length EMBEDDING_DIM, in input order, and
    must be deterministic and batch-independent (contract §3.1–§3.4).
    """
    return [_deterministic_vector(_image_fingerprint(img)) for img in prepared]


def _embed_text_batch(prepared: list[Any]) -> list[list[float]]:
    """Forward pass over a batch of preprocessed texts. Same guarantees as above."""
    return [_deterministic_vector(text.encode("utf-8")) for text in prepared]


# --- Stub internals ----------------------------------------------------------
# Delete everything below when the real model lands.


def _image_fingerprint(img: Image.Image) -> bytes:
    """Stable bytes for a decoded image, so the same file always embeds identically
    regardless of container format or metadata."""
    return img.tobytes() + f"|{img.size}".encode()


def _deterministic_vector(payload: bytes) -> list[float]:
    """A deterministic pseudo-random unit vector derived from the input.

    This satisfies every structural invariant in the contract — fixed dimension,
    unit norm, deterministic, batch-independent — so the full backend pipeline can
    be built and tested against it.

    It carries NO semantic meaning. Two photos of the same product are as far apart
    as a shoe and a lamp. It exists to prove the plumbing, not to return results.
    """
    seed = int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")
    vec = np.random.default_rng(seed).normal(size=EMBEDDING_DIM)
    return _l2_normalize(vec)


def _l2_normalize(vec: np.ndarray) -> list[float]:
    norm = float(np.linalg.norm(vec))
    if norm == 0.0 or not np.isfinite(norm):
        raise EmbeddingError("INFERENCE_FAILED", "model produced a degenerate vector")
    return (vec / norm).astype(float).tolist()
