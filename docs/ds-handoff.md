# Modelling Handoff — Visual Search

**Audience:** whoever owns the embedding model.
**Read first:** [`embedding-service-contract.md`](./embedding-service-contract.md) — that
is the binding interface. This document is the *why*, the decisions we still need from
you, and the traps we already know about.

---

## 1. Scope

**You own exactly one thing:** a function from image bytes to a vector, and (if the model
supports it) from text to a vector in the same space. It is wrapped in a small HTTP
service that already exists at `services/embedder/`.

**You do not own:** the database, the vector index, the search API, the storefront, the
job queue, retries, batching, or deployment plumbing. All of that is built and will be
tested against a stub before your model arrives.

**Concretely, your work is to replace `_embed_image_batch()` and `_embed_text_batch()` in
`services/embedder/app/model.py`.** Everything else in that service — routing,
validation, error shaping, health reporting — is already written and satisfies the
contract. If you need to change anything outside those two functions, that is a signal
to talk to us, because it probably means the contract needs to change.

---

## 2. Why the interface is shaped this way

A few contract choices will feel restrictive. The reasoning, so you can push back with
context rather than guesswork:

**Preprocessing lives inside your service (§3.7).** Not because we don't trust the
backend, but because "the index path and the query path preprocessed images slightly
differently" is a bug that produces *plausible-looking but subtly wrong* results with no
error anywhere. Making preprocessing unreachable from outside the service makes that bug
unrepresentable.

**Vectors must be L2-normalized by you (§3.1).** Same reasoning: it removes a step the
backend could get wrong on one of two paths, and lets the database use inner-product
distance directly.

**`revision` must change on any numerics-affecting change (§4).** A mixed-model index is
the worst failure mode in this project because it fails *silently*. We would much rather
reindex unnecessarily ten times than serve one corrupted index.

**Per-item errors, not batch failure (§3.6).** We will be indexing thousands of assets,
some of which will be corrupt. One bad file must not kill a batch of 32.

---

## 3. Decisions we need from you

These block backend work. The first one blocks a database migration, so it is the most
urgent.

| # | Decision | Blocks | Notes |
|---|---|---|---|
| 1 | **Final `embedding_dim`** | DB migration, index build | The `vector(N)` column is sized from this. Changing it later means a migration *and* a full reindex. Give us a number you are confident in, or tell us to wait. |
| 2 | **`shared_space`: do image and text vectors live in the same space?** | Whether we build text-driven visual search at all | If no, we cut the feature rather than ship something that returns noise. |
| 3 | **Which model, and its licence** | Project write-up, deployment | Licence matters for the academic report. Please state it explicitly. |
| 4 | **CPU-only, or GPU required?** | `docker-compose.yml`, dev setup, demo plan | If GPU, we need to know now — it changes how the demo runs. |
| 5 | **Memory ceiling and model load time** | Container limits, health-check timings | Rough numbers are fine. |
| 6 | **Realistic p50/p95 latency for a 1-image request** | Whether the 800 ms query budget in §5 is achievable | If it isn't, tell us and we will redesign the query path (e.g. optimistic UI). |
| 7 | **Optimal batch size** | Backend chunking | We assumed 32. Correct us. |
| 8 | **Any input constraints we should enforce upstream** | Backend validation | e.g. minimum resolution below which results are worthless. |

### Product-level decisions (needed, but not blocking)

These are modelling judgements, not engineering ones, so they are yours to make:

- **A product has several images. Which do we index?** Options: featured asset only;
  every asset as its own row; every asset with the product's score being the best match
  across them. Option 3 gives the best recall and is what we'd build by default — the
  backend already supports it — but it multiplies index size by the average asset count.
- **What text do we embed for text search?** Product name alone, name + description,
  name + collection + facets? Note that CLIP's text encoder truncates hard at 77 tokens,
  so "the whole description" is often not an option.
- **Where is the "no good match" cutoff?** A distance threshold below which we show "no
  similar products found" rather than the least-bad result. This needs calibration data,
  not a guess — see §5.

---

## 4. Known traps

Ordered roughly by how much time they cost people.

### 4.1 The domain gap is the actual problem

Our catalog images are studio shots: even lighting, plain background, product centred,
shot straight on. Real query images are phone photos: cluttered background, odd angle,
mixed lighting, partial occlusion, motion blur.

An off-the-shelf model scores well when you evaluate catalog-image-against-catalog-image,
and then disappoints on real uploads. **Evaluate against phone photos from day one**, or
the metric will flatter the system right up until the demo.

### 4.2 Backgrounds can dominate the embedding

A general-purpose encoder may find a wooden tabletop more salient than the shoe sitting
on it, so "similar" results come back sharing a background rather than a product.
Mitigations range from cheap (centre crop, tighter resize) to involved (salient-object
detection or background removal at both index and query time). Worth measuring before
investing.

### 4.3 EXIF orientation

Phone photos carry an EXIF orientation tag. Decoders differ on whether they apply it.
An image rotated 90° relative to how it was indexed produces a badly wrong vector. Apply
EXIF transpose explicitly during preprocessing — do not rely on the decoder's default.

### 4.4 Colour mode

Our asset pipeline emits RGB, but user uploads bring RGBA screenshots, greyscale scans,
palette PNGs, and occasionally CMYK. Convert to RGB explicitly. An RGBA tensor fed to a
3-channel model either crashes or, worse, silently misreads channels.

### 4.5 Aspect ratio: crop vs pad

Centre-cropping a wide product photo to a square can cut the product in half. Padding
preserves the whole product but shrinks it and introduces border artifacts. There is no
universally right answer — but whichever you pick **must be identical on both paths**,
which the contract enforces by keeping preprocessing inside the service.

### 4.6 Determinism is easy to lose accidentally

Leaving the model in training mode, random-resized-crop left in the inference transform,
or unseeded test-time augmentation all break §3.3 and make results irreproducible in a
way that is hard to notice. Our contract tests check this, but knowing why saves the
debugging trip.

### 4.7 Normalization constants belong to the model

Mean/std values are model-specific and applying the wrong ones degrades results without
erroring. Take them from the model card, not from a tutorial.

### 4.8 Dimension is not free

Higher dimensions store more information and cost more on every axis: storage, index
build time, query latency, memory. At our catalog size, 512 is comfortable and 768 is
fine. Beyond that, tell us so we can re-tune the ANN index parameters.

---

## 5. Evaluation

We cannot answer "did that change help?" without this, and a project that reports
recall@k is substantially stronger than one that shows screenshots.

**What we need built (jointly — tell us how much of it you want to own):**

1. **A labelled query set.** ~30–50 query images, each tagged with the product IDs that
   count as a correct match. Crucially, these should be *phone photos of real products in
   the catalog*, not catalog images — per §4.1.
2. **A metric.** recall@1, recall@5, recall@10 against that set. Fixed, so numbers are
   comparable across model versions.
3. **A baseline.** Run the metric on the first model you stand up and record it. Every
   subsequent change is measured against that number.
4. **Calibration data for the cutoff.** Distance distributions for known-good matches vs
   known-bad, which is what sets the threshold in §3.

**Please version results by `revision`,** so a score always maps to an exact model state.

---

## 6. Getting started

The service already runs and satisfies the contract — with a stub that returns
deterministic pseudo-random vectors. It proves the plumbing works. It performs **no real
similarity**: two photos of the same shoe are as far apart as a shoe and a lamp. Do not
demo it.

```bash
# From the repo root
docker compose -f apps/server/docker-compose.yml up -d embedder
curl localhost:8100/health
```

To replace the stub:

1. Open `services/embedder/app/model.py`.
2. Implement `load_model()`, `_embed_image_batch()`, `_embed_text_batch()`.
3. Set `MODEL_ID`, `EMBEDDING_DIM`, `REVISION`, `SHARED_SPACE` at the top of the file.
4. Add your dependencies to `services/embedder/requirements.txt`.
5. Run the contract tests: `python -m pytest services/embedder/tests/` — these assert
   every invariant in §3 of the contract. They must pass before we index anything.

The stub and the real model are interchangeable at any time, so you can develop against
a live backend without coordinating a cutover.
