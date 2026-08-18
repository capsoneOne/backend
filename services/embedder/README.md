# Embedding service

Turns image bytes into vectors. This is the only component in the system that knows
anything about a model.

- **Interface:** [`docs/embedding-service-contract.md`](../../docs/embedding-service-contract.md) — binding, frozen for v1
- **Context and known traps:** [`docs/ds-handoff.md`](../../docs/ds-handoff.md)

## Current state

Running **`Panavath/fashion-clip-b32`** — a ViT-B/32 CLIP fine-tuned on fashion, loaded
via `open_clip`. 512-d, which is why no migration was needed.

Image similarity works: same-category pairs score ~0.90–0.93 cosine, cross-category
~0.79–0.82. **Text-to-image looks weak** — a "blue jeans" query ranked a shirt first on a
5-image spot check. Nothing calls `searchByDescription`, so this is not user-facing, but
do not quote text numbers without running `eval/`.

## Which model runs

`EMBEDDER_MODEL` in `apps/server/.env` selects the implementation:

| value | module | what it is |
|---|---|---|
| `openclip` | `model_openclip.py` | the fine-tune — current |
| `clip` | `model_clip.py` | stock OpenAI CLIP ViT-B/32, eval baseline |
| `sim` | `model_sim.py` | colour/structure only |
| `stub` | `model.py` | structurally valid, no meaning |

`EMBEDDER_OPENCLIP_REPO` points `openclip` at a different HF repo without code changes.

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

There is no bind mount, so **`docker compose build embedder` after any `.py` edit** or the
container keeps running the old code.

## Add a model

Copy [`app/model_openclip.py`](app/model_openclip.py), implement the same five functions,
add one branch to [`app/model_registry.py`](app/model_registry.py). `app/main.py` is
model-agnostic and should not need edits.

For another open_clip checkpoint, skip all that and set `EMBEDDER_OPENCLIP_REPO`.

`REVISION` is **derived**, not typed — repo + HF commit sha + `PREPROCESS_REVISION`, e.g.
`fashion-clip-b32-f53c01ae1fa3-p1`. A new checkpoint moves the sha automatically; bump
`PREPROCESS_REVISION` by hand when the transform, tokenizer or normalization changes. The
backend stamps this on every vector and filters on it, so two checkpoints sharing one
revision silently merges two incomparable vector spaces.
