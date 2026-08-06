# Embedding service

Turns image bytes into vectors. This is the only component in the system that knows
anything about a model.

- **Interface:** [`docs/embedding-service-contract.md`](../../docs/embedding-service-contract.md) — binding, frozen for v1
- **Context and known traps:** [`docs/ds-handoff.md`](../../docs/ds-handoff.md)

## Current state

Running a **deterministic stub**. It satisfies every structural invariant in the
contract — fixed dimension, unit norm, deterministic, batch-independent — so the
backend pipeline can be built and tested end to end.

It performs **no real similarity**. Two photos of the same product are as far apart as
a shoe and a lamp. Do not demo it.

## Run

```bash
# In Docker, alongside the rest of the stack
docker compose -f ../../apps/server/docker-compose.yml up -d embedder
curl localhost:8100/health

# Or locally
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
python -m pytest tests/ -v
```

These are contract tests, not unit tests — they assert the invariants the backend
relies on and are model-agnostic by design. They must pass before any indexing run.

## Replace the stub

Everything you need to change is in [`app/model.py`](app/model.py): four constants and
five functions. `app/main.py` is model-agnostic and should not need edits.

Bump `REVISION` whenever anything that could alter a vector changes — weights,
preprocessing, or a pinned library version. The backend uses it to detect a stale index.
