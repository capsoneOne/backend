cd ~/Desktop/visual-search-capstone
EMBEDDER_MODEL=sim npm run infra:up     # Postgres 6543 + embedder 8100
npm run dev                              # Vendure 3000 + storefront 3001

npm run test -w storefront                                    # 24 tests
docker compose -f apps/server/docker-compose.yml run --rm --no-deps \
  embedder python -m pytest tests/ -q                          # 20, stub
docker compose -f apps/server/docker-compose.yml run --rm --no-deps \
  -e EMBEDDER_MODEL=sim -e SIM_LOAD_SECONDS=0 -e SIM_LATENCY_MS=0 \
  embedder python -m pytest tests/ -q                          # 20, sim