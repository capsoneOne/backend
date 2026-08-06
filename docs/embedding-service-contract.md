# Embedding Service Contract v1

**Status:** frozen for v1. Changes require agreement from both the backend and the
modelling side, because a change here invalidates the entire stored index.

This is the single boundary between the Vendure backend and the embedding model.
The backend knows nothing about the model. The model knows nothing about Vendure.
Everything either side needs to agree on is written down here.

---

## 1. Why this boundary exists

Visual search has two halves with very different iteration speeds:

- **The backend** (indexing, storage, ranking, filtering, API, UI) changes rarely once
  it works, and must be reliable.
- **The model** (which network, what preprocessing, what fine-tuning) changes often
  while it is being tuned, and is expected to be swapped several times.

Putting an HTTP boundary between them means the model can be replaced without a
backend deploy, and the backend can be built and tested before the model exists.

---

## 2. Service interface

Base URL is supplied to the backend as `EMBEDDER_URL` (e.g. `http://embedder:8000`).
All request and response bodies are JSON, UTF-8.

### `GET /health`

Readiness probe **and** the authoritative declaration of what this service is.
Model weights can take tens of seconds to load; return non-200 until they are loaded
and a warm-up inference has succeeded.

```json
{
  "status": "ok",
  "model_id": "openai/clip-vit-base-patch32",
  "embedding_dim": 512,
  "revision": "2026-08-06.1",
  "normalized": true,
  "modalities": ["image", "text"],
  "shared_space": true
}
```

| Field | Meaning |
|---|---|
| `status` | `"ok"` only when ready to serve. Anything else ⇒ non-200. |
| `model_id` | Human-readable model identity. Informational. |
| `embedding_dim` | Vector length. **The backend's DB column is sized from this.** |
| `revision` | Opaque version string. See §4 — this is the reindex trigger. |
| `normalized` | Must be `true` for v1. See §3.1. |
| `modalities` | Which `/embed/*` endpoints are implemented. |
| `shared_space` | `true` if image and text vectors are directly comparable. See §3.5. |

### `POST /embed/images`

```json
{
  "items": [
    { "id": "variant-42-asset-7", "data": "<base64-encoded image bytes>" },
    { "id": "variant-43-asset-1", "data": "<base64-encoded image bytes>" }
  ]
}
```

`id` is an opaque caller-owned string, echoed back verbatim. The service must not
parse or interpret it. `data` is the raw image file, base64-encoded — the file as it
exists on disk, not a re-encoded or pre-resized version.

### `POST /embed/text`

```json
{
  "items": [
    { "id": "q1", "text": "red leather ankle boot" }
  ]
}
```

### Response (both endpoints, identical shape)

```json
{
  "model_id": "openai/clip-vit-base-patch32",
  "embedding_dim": 512,
  "revision": "2026-08-06.1",
  "results": [
    { "id": "variant-42-asset-7", "vector": [0.021, -0.113, "..."], "error": null },
    { "id": "variant-43-asset-1", "vector": null,
      "error": { "code": "DECODE_FAILED", "message": "cannot identify image file" } }
  ]
}
```

Results are returned **in the same order as the request items**.

---

## 3. Invariants

These are testable assertions. The backend's contract test suite checks every one of
them against whatever is running at `EMBEDDER_URL`. A build that violates one is a
broken build, not a tuning issue.

### 3.1 Vectors are L2-normalized

Every returned vector satisfies `abs(norm(v) - 1.0) < 1e-5`.

Normalizing inside the service — not in the backend — means cosine similarity reduces
to a plain inner product, and removes an entire class of "we forgot to normalize on
one of the two paths" bug. The backend will not re-normalize.

### 3.2 Dimension is fixed and declared

Every vector in every response has exactly `embedding_dim` elements, matching
`/health`. All values are finite (no `NaN`, no `Infinity`).

### 3.3 Determinism

The same input bytes produce the same vector across calls, across process restarts,
and across replicas of the same `revision`, within `1e-4` per element.

This means: eval mode, no dropout, no random augmentation, no random cropping at
inference. If anything stochastic remains, it must be seeded.

### 3.4 Batch independence

An item's vector does not depend on what else was in the batch. Embedding `[A, B]`
and embedding `[A]` then `[B]` yield identical vectors for A and B.

This rules out batch-level normalization statistics leaking into inference.

### 3.5 Shared image/text space (if `shared_space: true`)

A text vector and an image vector of the same concept are closer to each other than
to an unrelated concept. If the chosen model does not support this, set
`shared_space: false` and the backend will disable text-driven visual search rather
than ship a feature that silently returns noise.

### 3.6 Partial failure is not total failure

A malformed or undecodable item yields `vector: null` and a populated `error` for
**that item only**, with the overall response still HTTP 200. Indexing thousands of
assets must not be derailed by three corrupt files.

HTTP 4xx is reserved for a malformed *request* (bad JSON, missing `items`, batch over
the limit). HTTP 5xx is reserved for the service itself being broken.

### 3.7 Preprocessing is internal

Resizing, cropping, colour conversion, normalization constants, EXIF handling — all of
it happens inside the service. The backend sends original bytes and never
pre-processes. This is what guarantees the index path and the query path cannot drift
apart, which is the most damaging failure mode in the system (see §6.1).

---

## 4. `revision` and the reindex trigger

`revision` is an opaque string that **must change whenever anything that could alter a
vector changes** — model weights, architecture, preprocessing, normalization, library
versions that affect numerics.

The backend stores `revision` on every embedding row. On startup and before each
indexing run it compares stored `revision` against `/health`. A mismatch means the
stored index is stale and a full reindex is required.

Getting this wrong is the single most expensive mistake available in this project: an
index containing vectors from two different models produces distances that are
arithmetically valid and semantically meaningless, with no error anywhere. **When in
doubt, bump the revision.** A needless reindex costs minutes; a silently corrupted
index costs days of debugging a "the results are just bad somehow" symptom.

---

## 5. Operational requirements

| Requirement | Value | Rationale |
|---|---|---|
| Max batch size | 32 items | Bounds request size and memory. Backend chunks larger jobs. |
| Max request body | 32 MB | Rejected with HTTP 413. |
| Query-path latency | p95 < 800 ms for a 1-item image request | This is in a user's page load. |
| Batch-path latency | no hard limit | Runs in a background job queue. |
| Accepted formats | JPEG, PNG, WebP at minimum | What Vendure's asset pipeline produces. |
| Max input resolution | service must accept ≥ 4000 px on the long edge | Phone camera uploads. Downscale internally. |
| Startup | `/health` non-200 until warm | Compose and orchestration gate on this. |
| Statelessness | no request-to-request state | Must be horizontally scalable. |

---

## 6. Error codes

| `code` | Meaning |
|---|---|
| `DECODE_FAILED` | Bytes are not a decodable image. |
| `UNSUPPORTED_FORMAT` | Decodable but not a supported format. |
| `TOO_LARGE` | Item exceeds the service's per-item limit. |
| `EMPTY_INPUT` | Zero-length data, or text that is empty after trimming. |
| `INFERENCE_FAILED` | Model raised on an otherwise valid input. |

The backend logs the code, marks that asset as failed with a retry count, and moves
on. It does not retry `DECODE_FAILED` or `UNSUPPORTED_FORMAT` — those are permanent.

---

## 7. Backend-side responsibilities (for reference)

So the modelling side knows what it does *not* need to build:

- Reading assets from disk and base64-encoding them
- Batching, chunking, retry, and backoff
- Storing vectors in Postgres/pgvector and building the ANN index
- Nearest-neighbour queries, business filters (stock, price, channel), ranking
- The GraphQL API and the storefront upload UI
- Job queue, reindex orchestration, `revision` tracking
- Deciding which of a product's assets to index, and how a product with several
  indexed assets is scored (see the open questions in `ds-handoff.md`)
