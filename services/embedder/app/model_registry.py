"""
Selects which model implementation the service runs.

Exists so the simulator can be developed against without editing `model.py`, which
has a single owner on the modelling side. Everything else imports `active` and never
names a concrete module, so adding a real encoder is a one-line change here.

    EMBEDDER_MODEL=stub    (default)  app/model.py           — deterministic, no meaning
    EMBEDDER_MODEL=sim                app/model_sim.py       — colour/structure, real ranking
    EMBEDDER_MODEL=clip               app/model_clip.py      — stock OpenAI CLIP ViT-B/32
    EMBEDDER_MODEL=openclip           app/model_openclip.py  — the fine-tune, via open_clip

Each implementation declares its own REVISION, so vectors produced by one can never
be compared against vectors produced by another: the backend stamps the revision on
every stored row and filters on it at query time.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger("embedder")

_CHOICE = os.getenv("EMBEDDER_MODEL", "stub").strip().lower()

if _CHOICE == "sim":
    from . import model_sim as active
elif _CHOICE == "stub":
    from . import model as active
elif _CHOICE == "clip":
    from . import model_clip as active
elif _CHOICE == "openclip":
    from . import model_openclip as active
else:
    raise RuntimeError(
        f"EMBEDDER_MODEL={_CHOICE!r} is not a known implementation. "
        "Expected 'stub', 'sim', 'clip' or 'openclip'."
    )

logger.info(
    "model implementation: %s (%s, revision %s)",
    _CHOICE, active.MODEL_ID, active.REVISION,
)

__all__ = ["active"]
