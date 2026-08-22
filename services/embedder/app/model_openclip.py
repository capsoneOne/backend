"""
The team's fine-tuned encoder: `Panavath/fashion-clip-b32`, loaded via `open_clip`.

Select with `EMBEDDER_MODEL=openclip` (see model_registry.py). This is the first
implementation carrying domain-specific meaning — it is a ViT-B/32 CLIP fine-tuned on
fashion imagery, where `model_clip.py` runs stock OpenAI CLIP and `model_sim.py` only
understands colour and coarse structure.

Why a separate module rather than editing `model_clip.py`: the weights are published in
open_clip's format, not the `transformers` CLIPModel format, so the loading and
tokenization paths genuinely differ. Keeping both lets stock CLIP stay available as a
comparison baseline for eval, which matters when judging whether the fine-tune helped.

Contract obligations this file is responsible for (docs/embedding-service-contract.md §3),
all asserted by tests/test_contract.py:

  * 512-d, L2-normalized, finite vectors. ViT-B/32's projection dim is 512, which is why
    EMBEDDING_DIM and the `vector(512)` DB column already agree. load_model() verifies
    this against the actual weights rather than trusting the architecture name.
  * Deterministic and batch-independent — eval mode, inference_mode, float32, the
    validation transform (never the training one), and fixed-length tokenization.
  * All preprocessing lives here, never in the backend, so the index path and the query
    path cannot drift apart (§3.7).

Weights are ~600 MB and download on first load into HF_HOME, which compose maps to the
`embedder_cache` volume. A container recreate must not re-download.
"""

from __future__ import annotations

import io
import logging
import os
from typing import Any

import numpy as np
import open_clip
import torch
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger("embedder")

# --- Declared identity -------------------------------------------------------
# REVISION must change whenever anything that could alter a vector changes: weights,
# architecture, preprocessing, normalization, or a library version affecting numerics.
# A stale REVISION silently corrupts the index — contract §4.
#
# The date suffix is the day this implementation landed; the trailing counter exists so
# a preprocessing fix on the same day is still a distinct revision.

HF_REPO = os.getenv("EMBEDDER_OPENCLIP_REPO", "Panavath/fashion-clip-b32").strip()
MODEL_ID = f"hf-hub:{HF_REPO}"
EMBEDDING_DIM = 512
SHARED_SPACE = True
MODALITIES = ["image", "text"]

# PREPROCESS_REVISION covers everything in THIS file that shapes a vector but is not
# the weights: the transform, the tokenizer choice, the normalization. Bump it by hand
# when any of those change — the checkpoint sha will not move for a code-only change.
PREPROCESS_REVISION = "p1"

# REVISION is derived, never hand-typed.
#
# It is the identity the backend stamps on every stored vector and filters on at query
# time, so two different checkpoints sharing one revision string means two incomparable
# vector spaces silently occupying the same index — the single worst failure this
# service has. A hand-maintained constant makes that a typo away, and with several
# fine-tunes now arriving it is a matter of when, not if.
#
# Composing repo + commit sha + preprocessing tag makes a collision structurally
# impossible: a new checkpoint moves the sha, and a preprocessing change moves the tag.
# Resolved at import time so it is available to /health before load_model() runs; falls
# back to "unpinned" only when the hub cannot be reached, which is loud in the string
# itself rather than silently reusing a stale identity.
def _resolve_revision() -> str:
    short_repo = HF_REPO.split("/")[-1]
    try:
        from huggingface_hub import HfApi

        sha = HfApi().model_info(HF_REPO).sha
        return f"{short_repo}-{sha[:12]}-{PREPROCESS_REVISION}"
    except Exception as exc:  # offline, private repo, hub outage
        logger.warning(
            "cannot resolve commit sha for %s (%s); revision will be marked unpinned, "
            "which is safe to search with but must not be used to publish eval numbers",
            HF_REPO, exc,
        )
        return f"{short_repo}-unpinned-{PREPROCESS_REVISION}"


REVISION = _resolve_revision()

# Marker embedded in the revision string when the hub could not be reached. The backend
# reads this to refuse a full reindex against an identity that will change on the next
# successful start — see the guard in VisualSearchService.reindexAll().
UNPINNED_MARKER = "-unpinned-"


def _is_unpinned(revision: str) -> bool:
    return UNPINNED_MARKER in revision

# The tokenizer is addressed by architecture, not by hub id, on the team's explicit
# instruction. For a ViT-B-32 fine-tune this is the standard CLIP BPE vocabulary with a
# 77-token context, which is what the weights were trained against. Resolving it from the
# hub instead would silently pick up a different context length if the repo ever declares
# one, and a text vector built on a different tokenization is not comparable.
TOKENIZER_ARCH = "ViT-B-32"

# CLIP's text encoder has a hard 77-token context including BOS/EOS. Longer text is
# truncated rather than rejected: a query that runs long is still a usable query,
# whereas an error would fail the whole search.
TEXT_CONTEXT_LENGTH = 77

# cpu by default because that is the deployment target (a free Hugging Face Space,
# 2 vCPU). Override for a GPU box; vectors agree to well within the contract's
# determinism tolerance either way.
DEVICE = torch.device(os.getenv("EMBEDDER_DEVICE", "cpu"))

_model: Any = None
_preprocess: Any = None
_tokenizer: Any = None


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

    The warm-up is not decoration: the first forward pass through a freshly loaded torch
    model allocates buffers and resolves kernels, costing seconds. Paying it here means
    the first real request does not.
    """
    global _model, _preprocess, _tokenizer, REVISION

    # REVISION is resolved at import time, which is the earliest /health can need it but
    # also the moment least likely to have working egress — a container that starts
    # before its network is ready falls back to "unpinned" permanently, and every vector
    # written in that process claims an identity the next start will not reproduce.
    # Retry here, where the hub is about to be contacted for weights anyway.
    if _is_unpinned(REVISION):
        retried = _resolve_revision()
        if not _is_unpinned(retried):
            logger.info("revision resolved on retry: %s -> %s", REVISION, retried)
            REVISION = retried
        else:
            logger.error(
                "revision is still unpinned (%s). The service will serve queries, but a "
                "full reindex stamped with this identity is invalid: the next start that "
                "reaches the hub will resolve a different revision and orphan every row.",
                REVISION,
            )

    threads = os.getenv("TORCH_NUM_THREADS")
    if threads:
        torch.set_num_threads(int(threads))

    logger.info("loading %s onto %s", MODEL_ID, DEVICE)

    # create_model_and_transforms returns (model, preprocess_train, preprocess_val).
    # Taking the THIRD element is load-bearing: preprocess_train applies
    # RandomResizedCrop, so the same image would embed differently on every call and
    # break both determinism (§3.3) and any hope of index/query agreement.
    _model, _, _preprocess = open_clip.create_model_and_transforms(MODEL_ID)
    _tokenizer = open_clip.get_tokenizer(TOKENIZER_ARCH)

    _model.to(DEVICE)
    _model.eval()

    # Verify the real output width rather than trusting the architecture name. A wrong
    # length escaping into the database fails on insert with a message that names
    # Postgres, not the model.
    with torch.inference_mode():
        probe = _model.encode_image(torch.zeros(1, 3, 224, 224, device=DEVICE))
    projection_dim = int(probe.shape[-1])
    if projection_dim != EMBEDDING_DIM:
        raise RuntimeError(
            f"{MODEL_ID} produces {projection_dim}-d vectors, but this service declares "
            f"EMBEDDING_DIM={EMBEDDING_DIM}. Update both, the vector(N) DB column via a "
            f"new migration, and REVISION together."
        )

    _embed_image_batch([preprocess_image(_blank_png())])
    _embed_text_batch([preprocess_text("warm up")])
    logger.info("model ready, dim=%d, revision=%s", EMBEDDING_DIM, REVISION)


def preprocess_image(raw: bytes) -> Any:
    """Decode one image and apply open_clip's validation transform.

    EXIF transpose and RGB conversion happen here for the same reason the whole function
    does: the backend sends original file bytes, so this is the only place the index path
    and the query path can be guaranteed to agree (contract §3.7, ds-handoff §4.3/§4.4).
    """
    if not raw:
        raise EmbeddingError("EMPTY_INPUT", "image payload was empty")
    if _preprocess is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except UnidentifiedImageError as exc:
        raise EmbeddingError("DECODE_FAILED", "cannot identify image file") from exc
    except Exception as exc:  # truncated files, decompression bombs, bad palettes
        raise EmbeddingError("DECODE_FAILED", f"failed to decode image: {exc}") from exc

    # Phone photos carry a rotation tag decoders handle inconsistently. An image rotated
    # 90 degrees relative to how it was indexed embeds to a badly wrong vector, and
    # nothing anywhere reports an error.
    img = ImageOps.exif_transpose(img)

    # Uploads arrive as RGBA screenshots, greyscale scans, palette PNGs and occasionally
    # CMYK. The transform's Normalize expects 3 channels.
    if img.mode != "RGB":
        img = img.convert("RGB")

    try:
        # Resize, centre-crop, to-tensor and normalize with the mean/std baked into the
        # checkpoint by open_clip. Using the shipped transform rather than hand-rolling
        # it is deliberate: those constants are part of the weights' contract, and
        # getting them subtly wrong degrades recall without failing anything.
        tensor = _preprocess(img)
    except Exception as exc:
        raise EmbeddingError("DECODE_FAILED", f"failed to preprocess image: {exc}") from exc

    return tensor


def preprocess_text(text: str) -> Any:
    """Tokenize one query to CLIP's fixed context length."""
    cleaned = text.strip()
    if not cleaned:
        raise EmbeddingError("EMPTY_INPUT", "text was empty after trimming")
    if _tokenizer is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    # open_clip's tokenizer always pads to the full context length, so a text vector
    # never depends on what else shared its batch — which the contract forbids (§3.4)
    # and the test suite checks. Truncation is on so long input degrades rather than
    # raising.
    tokens = _tokenizer([cleaned], context_length=TEXT_CONTEXT_LENGTH)
    return tokens[0]


def _embed_image_batch(prepared: list[Any]) -> list[list[float]]:
    """Forward pass over preprocessed images.

    ViT has no cross-sample operations — no batch norm, no shared statistics — so
    stacking inputs is a pure throughput optimization and cannot change a vector.
    """
    if _model is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    pixel_values = torch.stack(prepared).to(DEVICE)
    with torch.inference_mode():
        features = _model.encode_image(pixel_values)
    return _l2_normalize_rows(features)


def _embed_text_batch(prepared: list[Any]) -> list[list[float]]:
    """Forward pass over tokenized text. Same guarantees as the image path."""
    if _model is None:
        raise EmbeddingError("INFERENCE_FAILED", "model was not loaded")

    tokens = torch.stack(prepared).to(DEVICE)
    with torch.inference_mode():
        features = _model.encode_text(tokens)
    return _l2_normalize_rows(features)


def _l2_normalize_rows(features: torch.Tensor) -> list[list[float]]:
    """Normalize inside the service so cosine reduces to an inner product, and the
    backend never has to remember to do it on one of the two paths (contract §3.1).

    Done in float64 on the numpy side rather than with torch.nn.functional.normalize:
    float32 division leaves the norm off 1.0 by ~1e-7 per element, which accumulates
    across 512 dimensions and can land outside the tolerance main.py enforces.
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
