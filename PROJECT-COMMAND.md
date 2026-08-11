cd ~/Desktop/visual-search-capstone
EMBEDDER_MODEL=sim npm run infra:up     # Postgres 6543 + embedder 8100
npm run dev                              # Vendure 3000 + storefront 3001
