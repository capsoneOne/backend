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
- `services/embedder` currently runs a deterministic **stub** that satisfies every
  structural invariant but carries no semantic meaning. Do not demo it as working search.
- Contract tests: `docker compose -f apps/server/docker-compose.yml run --rm --no-deps
  embedder python -m pytest tests/ -v`. These must pass before any indexing run.
- Any change that could alter a vector requires bumping `REVISION` in
  `services/embedder/app/model.py`, which triggers a full reindex. A mixed-model index
  fails silently and is the most expensive mistake available here.
- `eval/` — the recall@k harness. Run `npm run eval` after any change that could affect
  ranking, and read `eval/README.md` first: the committed query set is synthetic and the
  catalog is small, so recall@5 and recall@10 are near their ceiling by construction.

## Database Setup

- The schema is built entirely from migrations: `BaselineSchema1785980000000` creates
  Vendure's core tables, then `AddVisualSearch1785990000000` creates the pgvector table.
  Order matters and is enforced by the timestamps.
- `npm run seed` populates a development catalog and both indexes. It is idempotent.
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
- Evaluate search quality: `npm run eval`

## Quality Checks

- Run `npm run build` after changing backend code.
- Run targeted tests for the package or feature you changed.
