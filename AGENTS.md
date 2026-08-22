# visual-search-capstone Project Instructions

This project was generated with `@vendure/create`.

## Workspace Layout

- Vendure backend: `apps/server`
- Next.js storefront: `apps/storefront`
- Embedding service (Python, not an npm workspace): `services/embedder`
- Start both apps: `npm run dev`
- Start only the server: `npm run dev:server`
- Start only the storefront: `npm run dev:storefront`
- Backend custom code belongs in `apps/server/src/plugins`
- Backend runtime configuration is in `apps/server/src/vendure-config.ts`
- Backend static assets and email templates live in `apps/server/static`
- Infrastructure (Postgres + embedder) is in `apps/server/docker-compose.yml`

## Visual Search

The visual-search feature is split across a single HTTP boundary so the model and the
backend can be built and changed independently.

- `docs/embedding-service-contract.md` — the binding interface. **Frozen for v1**; read
  it before changing anything on either side of the boundary.
- `docs/ds-handoff.md` — modelling requirements, open decisions, and known traps.
- Postgres runs the `pgvector/pgvector:pg16` image; vectors live in the same database as
  the catalog so similarity queries can join against stock, price, and channel.
- `services/embedder` runs **`Panavath/fashion-clip-b32`** (open_clip, 512-d), selected by
  `EMBEDDER_MODEL=openclip`. `clip`, `sim` and `stub` remain available; `clip` is the
  stock-CLIP baseline for eval comparisons. Image similarity works; text-to-image is
  unmeasured and looked weak on a spot check.
- The embedder has no bind mount: run `docker compose -f apps/server/docker-compose.yml
  build embedder` after editing any `.py`, or the container keeps the old code.
- Contract tests: `docker compose -f apps/server/docker-compose.yml run --rm --no-deps
  embedder python -m pytest tests/ -v`. These must pass before any indexing run.
- `REVISION` is derived from the HF commit sha, not hand-typed, so a new checkpoint gets a
  new revision automatically. Bump `PREPROCESS_REVISION` when preprocessing changes. A
  mixed-model index fails silently and is the most expensive mistake available here.
- `EmbedderService.getHealth()` caches for 60s. Swapping models without restarting Vendure
  can stamp new vectors with the old revision inside that window; `reindexAll` forces a
  refresh first.
- `eval/` — the recall@k harness. Run `npm run eval` after any change that could affect
  ranking, and read `eval/README.md` first: the committed query set is synthetic and the
  catalog is small, so recall@5 and recall@10 are near their ceiling by construction.

### Reindex runbook

A full reindex is ~4,295 images in ~135 jobs and takes minutes, so the failures that
matter are the silent ones. In order:

1. `docker compose -f apps/server/docker-compose.yml build embedder` if any `.py`
   changed. There is no bind mount; without this the container runs the old code and
   may report a revision the source no longer produces.
2. `curl localhost:8100/health` and check `revision`. If it contains `unpinned`, the
   embedder could not reach the hub and `reindexVisualSearch` will refuse — restart it
   with working network access rather than overriding.
3. Do not run `catalog:import` or bulk product edits during a reindex. Every
   `ProductEvent` enqueues another job, and they compete with the batch jobs.
4. Run the `reindexVisualSearch` mutation. Watch for `VisualSearchPlugin` errors: a
   product whose source image cannot be read now keeps its existing vectors and is
   logged at error level rather than silently dropped.
5. Verify with `visualSearchIndexStatus`. Expect `current` = 4,295 and `stale` = 0.
   `products` below the catalog count means images went unread.
6. If the run was interrupted, re-run with `onlyMissing: true` — it enqueues just the
   products lacking a row at the live revision instead of starting over.

Memory is the one environmental trap: Postgres, Vendure, the storefront and float32
torch share the machine, and Docker Desktop's default VM allocation is smaller than the
host's RAM. An OOM-killed embedder fails safe (the HTTP error aborts the job before any
delete), but it wastes the run.

## Database Setup

- The schema is built entirely from migrations: `BaselineSchema1785980000000` creates
  Vendure's core tables, then `AddVisualSearch1785990000000` creates the pgvector table.
  Order matters and is enforced by the timestamps.
- `npm run seed` populates a small development catalog and both indexes. It is idempotent.
- For the 4,295-product dataset, use `apps/server/scripts/bulk-import/` instead:
  `catalog:setup` (idempotent prerequisites) → `catalog:build` (CSV, 4 variants per
  product) → `catalog:import` (batched, resumable). See that folder's script headers.
- `importProducts` creates, never upserts. Re-running duplicates; the progress file next
  to the CSV is what prevents it, and a fingerprint mismatch fails safe by refusing.
- Do **not** use `synchronize: true` to build the schema. It types the embedding column
  as `text` and skips the HNSW index, producing a table that `<=>` cannot query. If a
  database was already built that way, record the baseline as applied rather than
  running it — see the migration's header comment.

## Vendure Development

- Prefer implementing custom functionality as a Vendure plugin.
- Use `npx vendure add` to scaffold plugins, entities, services, API extensions, and job queues.
- Read environment variables in `vendure-config.ts` and pass values into plugins through `Plugin.init()` options.
- Create job queues in `onModuleInit()` or `onApplicationBootstrap()`, then reuse the queue when adding jobs.
- Pass `RequestContext` to Vendure services and `TransactionalConnection` methods when it is available.
- Do not commit `.env` values or generated runtime data.
- Do not use `dbConnectionOptions.synchronize: true` for production data.

## Commands

- Start development: `npm run dev`
- Build: `npm run build`
- Seed a development catalog: `npm run seed`
- Bulk-load the full dataset: `npm run catalog:setup` → `catalog:build` → `catalog:import`
- Evaluate search quality: `npm run eval`

## Quality Checks

- Run `npm run build` after changing backend code.
- Run targeted tests for the package or feature you changed.


## emdash 
- dont use it