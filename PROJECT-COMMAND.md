cd ~/Desktop/visual-search-capstone
npm run infra:up                         # Postgres 6543 + embedder 8100
npm run dev                              # Vendure 3000 + storefront 3001

# Model is picked by EMBEDDER_MODEL in apps/server/.env
#   openclip = Panavath/fashion-clip-b32 (current)   clip = stock CLIP (baseline)
#   sim = colour/structure               stub = no meaning
curl localhost:8100/health               # check model_id, revision, dim

# Bulk catalog: 1 product -> 4 variants (2 sizes x 2 colours)
npm run catalog:setup -- --dry-run       # check tax/zone/stock prerequisites
npm run catalog:build                    # static/a/catalog.csv -> catalog-import.csv
npm run catalog:import -- --limit=1      # smoke test, then drop --limit
                                         # resumable; --restart re-imports from zero

npm run test -w storefront                                    # 24 tests
docker compose -f apps/server/docker-compose.yml run --rm --no-deps \
  embedder python -m pytest tests/ -q                          # 20, contract
docker compose -f apps/server/docker-compose.yml build embedder  # after any .py edit

npm run eval                             # needs a complete index on one revision
