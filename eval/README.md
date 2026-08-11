# Visual search evaluation

Answers "did that change help?" with a number instead of a screenshot.

```bash
npm run infra:up      # Postgres + embedder
npm run dev           # Vendure + storefront
npm run seed          # catalog + both indexes (first run only)
npm run eval
```

Results land in `eval/results/<revision>.json`, keyed by the embedder's own `revision`
string, so a score always maps to an exact model state — the requirement in
[`ds-handoff.md`](../docs/ds-handoff.md) §5.

---

## Read this before quoting any number

Two things currently make the numbers softer than they look. Both are fixable, and
fixing them is the point of this directory.

### 1. The query set is synthetic

`eval/queries/images/` holds catalog images with rotation, cropping, exposure shifts,
noise and a cluttered backdrop applied — **not photographs**. See
`make-provisional-set.py`.

[`ds-handoff.md`](../docs/ds-handoff.md) §4.1 is blunt about why this matters: the real
problem is the domain gap between studio catalog shots and phone photos, and a model
evaluated on catalog-derived images *scores well and then disappoints on real uploads*.
This set measures robustness to a handful of synthetic corruptions, which is a strictly
easier task than the one the system actually faces.

It exists so the harness is runnable and a mechanical baseline exists before the real
model lands. It is not evidence the feature works.

### 2. The catalog is tiny

With N products indexed, random ranking already achieves recall@k = k/N. At N=8 that
means **random recall@10 is 1.000** — a perfect score that means nothing. The runner
prints a random baseline and "headroom captured" next to every metric for this reason,
and warns when N < 50.

Read **recall@1** and **headroom captured**. Ignore recall@5 and recall@10 until the
catalog is large enough for them to discriminate.

---

## Replacing the provisional set with real photos

This is the highest-value work in this directory and needs no code changes.

1. Photograph 30–50 real products from the catalog with a phone. Vary angle, lighting,
   distance, background clutter and partial occlusion — the conditions §4.1 describes.
2. Drop the files in `eval/queries/images/`.
3. Add an entry per photo to `eval/queries/queries.json`:

   ```json
   {"id": "boot-on-desk", "image": "boot-on-desk.jpg", "kind": "phone",
    "relevantSlugs": ["red-leather-boot"]}
   ```

   `relevantSlugs` is the ground truth: every product that counts as a correct match.
   `kind` is a free-form tag; the runner reports recall broken down by it, which is how
   you find out that (say) low light is what is actually hurting you.
4. Change `"set"` in `queries.json` to a new name. The runner flags cross-set
   comparisons as not comparable rather than silently printing a meaningless delta.
5. Delete the synthetic images and `make-provisional-set.py`.

---

## What the runner reports

| Output | Meaning |
|---|---|
| `recall@1/5/10` | Fraction of queries with a correct product in the top k |
| `random` | What chance would score on this catalog size |
| `headroom captured` | `(score − random) / (1 − random)`. 0 = no better than chance, 1 = perfect |
| `mrr` | Mean reciprocal rank — rewards ranking the right product higher, not just inside k |
| `by query kind` | The same metrics split by the `kind` tag, to localise failures |
| `calibration` | Distance distributions for correct matches vs the best wrong match |
| `latency` | Including p95, which the [contract](../docs/embedding-service-contract.md) §5 budgets at < 800 ms |

### Calibration is what sets the "no good match" cutoff

The system currently returns its top k unconditionally, so an unrelated photo still
yields confident-looking products. A threshold needs to sit between the distance
distribution of correct matches and that of distractors.

`median separation` is that gap. If it is zero or negative, correct matches are not
closer than wrong ones and **no threshold can work** — the runner says so explicitly.
Set the cutoff from the `p90` of the correct-match distribution once the query set is
real, and re-derive it on every revision.

---

## Guards

The runner refuses to produce numbers it cannot stand behind, and exits non-zero:

- embedder unreachable or still loading
- the index is empty
- the index revision does not match the live embedder revision — the stored vectors
  live in a different space, so distances would be arithmetically valid and
  semantically meaningless ([contract](../docs/embedding-service-contract.md) §4)

A stale-revision subset produces a warning rather than an exit, because recall is then
measured against a partial index: degraded recall, not corrupted precision.

---

## Baseline on record

`eval/results/sim-v1.json` — the `sim` simulator against `provisional-synthetic-v1`.

This is a **plumbing baseline**, not a model result. `sim` encodes colour and coarse
structure only; it cannot tell a red boot from a red mug. It is on record so the first
real model has something to beat and so the harness itself is demonstrably working.
