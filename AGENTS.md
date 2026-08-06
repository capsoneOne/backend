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

## Quality Checks

- Run `npm run build` after changing backend code.
- Run targeted tests for the package or feature you changed.
