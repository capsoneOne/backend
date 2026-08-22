// Step 1 — Clone the repository and install dependencies (npm workspaces):
git clone <repository-url> visual-search-capstone
cd visual-search-capstone
npm install

// Step 2 — Configure the backend. Create apps/server/.env:
APP_ENV=dev
DB_HOST=localhost
DB_PORT=6543
DB_NAME=vendure
DB_USERNAME=vendure
DB_PASSWORD=your_secure_password
EMBEDDER_URL=http://localhost:8100
EMBEDDER_MODEL=openclip

// Step 3 — Configure the storefront. Create apps/storefront/.env.local:
VENDURE_SHOP_API_URL=http://localhost:3000/shop-api
VENDURE_CHANNEL_TOKEN=__default_channel__

// Step 4 — Start PostgreSQL with pgvector and the embedding service:
npm run infra:up

// Step 5 — Seed the catalogue and build the vector index (first run only):
npm run seed

// Step 6 — Start the backend and storefront together:
npm run dev
