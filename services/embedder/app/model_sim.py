"""
A stand-in that behaves like the real encoder, for building against before one exists.

This is NOT model.py. That file belongs to the modelling side and stays untouched, so
the real CLIP implementation lands without a merge conflict. Select this one with
`EMBEDDER_MODEL=sim` (see model_registry.py).

What it simulates, and why each part matters downstream:

  * **Real similarity.** Vectors come from colour and coarse structure, so two photos
    of the same red boot land near each other and a lamp does not. The stub cannot do
    this — it hashes bytes, making every pair equidistant — which blocks the ranking
    UI, the eval harness and any integration test that asserts an ordering.

  * **A genuinely shared image/text space.** Text is embedded by synthesizing a small
    image from the colour words it contains and running it through the *same* encoder.
    So `shared_space` is true by construction rather than by assertion, and the text
    search and zero-shot category work can be built now. It only understands colour
    and brightness language — that is the honest limit.

  * **Cold start and latency.** SIM_LOAD_SECONDS and SIM_LATENCY_MS make startup and
    inference take realistic time, so the /health 503-until-warm path, the storefront's
    warming state and the 800 ms budget are all exercised against something that
    actually stalls.

It is still not a semantic model: it cannot tell a red boot from a red mug. Do not
report numbers from it. REVISION is distinct so its vectors can never mix with the
stub's or the real model's.
"""

from __future__ import annotations

import hashlib
import io
import os
import time
from typing import Any

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

# --- Declared identity -------------------------------------------------------

MODEL_ID = "sim-clip-vit-b32"
EMBEDDING_DIM = 512
REVISION = "sim-v1"
SHARED_SPACE = True
MODALITIES = ["image", "text"]

# --- Simulated performance ---------------------------------------------------
# Defaults are deliberately non-zero: a simulator that returns instantly hides every
# cold-start and latency bug you are trying to find. Set to 0 in CI for speed.

SIM_LOAD_SECONDS = float(os.getenv("SIM_LOAD_SECONDS", "3"))
SIM_LATENCY_MS = float(os.getenv("SIM_LATENCY_MS", "45"))

# --- Feature layout ----------------------------------------------------------
# 64 structure + 48 RGB histogram + 32 hue histogram = 144 raw features, projected
# up to EMBEDDING_DIM. The projection is fixed and seeded, so it is deterministic
# across processes and gives a dense vector shaped like a real embedding.

_GRID = 8
_RGB_BINS = 16
_HUE_BINS = 32
_GLOBALS = 7
_RAW_DIM = _GRID * _GRID + 3 * _RGB_BINS + _HUE_BINS + _GLOBALS

_projection: np.ndarray | None = None


class EmbeddingError(Exception):
    """A per-item failure. Yields `vector: null` plus this code for that item only,
    leaving the rest of the batch unaffected (contract §3.6)."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def load_model() -> None:
    global _projection
    if SIM_LOAD_SECONDS > 0:
        time.sleep(SIM_LOAD_SECONDS)
    _projection = np.random.default_rng(20260811).normal(size=(_RAW_DIM, EMBEDDING_DIM))
    # Warm up, exactly as a real load_model() should.
    _embed_image_batch([Image.new("RGB", (8, 8), (127, 127, 127))])


def preprocess_image(raw: bytes) -> Any:
    """Decode and preprocess one image. Identical rules to model.py — EXIF transpose
    and explicit RGB conversion live here, never in the backend (contract §3.7)."""
    if not raw:
        raise EmbeddingError("EMPTY_INPUT", "image payload was empty")
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except UnidentifiedImageError as exc:
        raise EmbeddingError("DECODE_FAILED", "cannot identify image file") from exc
    except Exception as exc:
        raise EmbeddingError("DECODE_FAILED", f"failed to decode image: {exc}") from exc

    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def preprocess_text(text: str) -> Any:
    cleaned = text.strip()
    if not cleaned:
        raise EmbeddingError("EMPTY_INPUT", "text was empty after trimming")
    return cleaned


def _embed_image_batch(prepared: list[Any]) -> list[list[float]]:
    _sleep_for(len(prepared))
    return [_project(_image_features(img)) for img in prepared]


def _embed_text_batch(prepared: list[Any]) -> list[list[float]]:
    """Text is embedded by rendering it to an image and reusing the image encoder.

    That is what makes the shared space real rather than declared: "red boot" and a
    photo of a red boot travel through identical code and land near each other.
    """
    _sleep_for(len(prepared))
    return [_project(_image_features(_render_text(t))) for t in prepared]


# --- Feature extraction ------------------------------------------------------


def _image_features(img: Image.Image) -> np.ndarray:
    """Colour and coarse structure, weighted so the subject beats the background.

    Two corrections, both learned by measuring rather than guessing:

    1. **Saturation weighting.** Plain histograms let a large white or grey backdrop
       dominate, so two unrelated products shot on the same studio background scored
       0.99 against each other — trap §4.1/§4.2 in docs/ds-handoff.md, reproduced
       faithfully by accident. Weighting each pixel by saturation x value means
       neutral background contributes almost nothing and the subject's colour decides.

    2. **Mean-centering.** Non-negative features pushed through a random projection
       all land in a narrow cone, so every cosine sat near 1.0 and rankings were
       nearly flat. Centering spreads them across a usable range.

    Blocks are normalized independently so one cannot dominate by sheer scale.
    """
    grey = np.asarray(
        img.convert("L").resize((_GRID, _GRID), Image.BILINEAR), dtype=np.float64
    ).ravel() / 255.0
    structure = grey - grey.mean()

    small = img.resize((64, 64), Image.BILINEAR)
    hsv = np.asarray(small.convert("HSV"), dtype=np.uint8).reshape(-1, 3).astype(np.float64)
    weight = (hsv[:, 1] / 255.0) * (hsv[:, 2] / 255.0)

    hue_hist = np.bincount(
        (hsv[:, 0].astype(int)) // (256 // _HUE_BINS), weights=weight, minlength=_HUE_BINS
    )

    pixels = np.asarray(small, dtype=np.uint8).reshape(-1, 3)
    rgb = np.concatenate([
        np.bincount(pixels[:, c] // (256 // _RGB_BINS), weights=weight, minlength=_RGB_BINS)
        for c in range(3)
    ])

    # Global statistics, plus a constant bias.
    #
    # Every block above can be entirely zero. Flat grey has no saturation, so the
    # weighted histograms vanish and grey minus its own mean is zero. Pure black is
    # worse still: brightness, saturation, contrast and mean RGB are all zero too, so
    # even these statistics collapse — and `Image.new(mode, size)` defaults to black,
    # which is exactly what the colour-mode contract tests feed in.
    #
    # The trailing 1.0 guarantees the raw vector is never all-zero. Mean-centering
    # cannot flatten it either, since that needs every feature to be identical and
    # the centered structure block always sums to zero.
    stats = np.array([
        hsv[:, 2].mean() / 255.0,          # brightness
        hsv[:, 1].mean() / 255.0,          # saturation
        float(grey.std()),                 # contrast
        *(pixels.mean(axis=0) / 255.0),    # mean R, G, B
        1.0,                               # bias — never let the vector degenerate
    ])

    # Hue carries most of the object signal once the background is suppressed.
    return np.concatenate([_unit(structure), 2.0 * _unit(hue_hist), _unit(rgb), stats])


def _unit(block: np.ndarray) -> np.ndarray:
    norm = float(np.linalg.norm(block))
    return block / norm if norm > 0 else block


# A deliberately small lexicon. Words outside it fall back to a hashed colour, which
# keeps text deterministic and distinct without pretending to understand it.
_LEXICON: dict[str, tuple[int, int, int]] = {
    "red": (200, 40, 40), "crimson": (180, 20, 50), "pink": (240, 150, 180),
    "orange": (230, 130, 40), "yellow": (230, 210, 60), "gold": (200, 170, 60),
    "green": (60, 160, 70), "olive": (120, 130, 60), "teal": (40, 150, 150),
    "blue": (50, 90, 200), "navy": (30, 45, 110), "purple": (130, 70, 180),
    "brown": (120, 80, 50), "tan": (190, 160, 120), "beige": (225, 210, 180),
    "black": (25, 25, 25), "grey": (128, 128, 128), "gray": (128, 128, 128),
    "silver": (190, 190, 195), "white": (240, 240, 240),
    "dark": (45, 45, 45), "light": (215, 215, 215), "bright": (250, 240, 200),
}


def _render_text(text: str) -> Image.Image:
    """Turn a phrase into a small swatch image built from the colours it names."""
    words = [w.strip(".,!?;:'\"").lower() for w in text.split()]
    colours = [_LEXICON[w] for w in words if w in _LEXICON]

    if not colours:
        # No colour language: derive one deterministically so different phrases still
        # produce different vectors, as the contract requires.
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        colours = [(digest[0], digest[1], digest[2])]

    swatch = Image.new("RGB", (64, 64))
    band = max(1, 64 // len(colours))
    for i, colour in enumerate(colours):
        top = i * band
        bottom = 64 if i == len(colours) - 1 else min(64, top + band)
        if top < 64:
            swatch.paste(Image.new("RGB", (64, bottom - top), colour), (0, top))
    return swatch


# --- Shared internals --------------------------------------------------------


def _sleep_for(count: int) -> None:
    if SIM_LATENCY_MS > 0:
        time.sleep(SIM_LATENCY_MS * count / 1000.0)


def _project(raw: np.ndarray) -> list[float]:
    if _projection is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")
    return _l2_normalize((raw - raw.mean()) @ _projection)


def _l2_normalize(vec: np.ndarray) -> list[float]:
    norm = float(np.linalg.norm(vec))
    if norm == 0.0 or not np.isfinite(norm):
        raise EmbeddingError("INFERENCE_FAILED", "model produced a degenerate vector")
    return (vec / norm).astype(float).tolist()
