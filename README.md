# StockPulse

StockPulse is an inventory management and dynamic-pricing application. It combines a React frontend with an Express and MySQL backend to monitor product stock, calculate rule-based pricing and reorder recommendations, and create suggestions when inventory is low or demand spikes.

## Features

- Product inventory management
- Stock updates and order fulfillment
- Low-inventory detection
- Demand-spike detection
- Rule-based pricing recommendations
- Rule-based reorder recommendations
- Accept or reject pricing suggestions
- MySQL persistence for products and suggestions
- Backend health check endpoint

## Project Structure

```text
backend/
  config/       MySQL connection configuration
  database/     Database initialization, seed data, and repositories
  routes/       Express API routes
  services/     Product, suggestion, and recommendation services
  server.js     Express application entry point
frontend/
  src/          React application source
  vite.config.js
.gitignore
backend/.env.example
```

## Requirements

- Node.js 18 or newer
- npm
- MySQL 8 or compatible MySQL server
- A MySQL user with permission to create the application database and tables

## Setup

### 1. Install dependencies

From the repository root:

```powershell
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure the backend

Copy the example environment file:

```powershell
cd backend
Copy-Item .env.example .env
```

Update `backend/.env` with your local MySQL credentials. Never commit this file. It is ignored by Git.

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=stockpulse_dev
PORT=3001
DEMAND_SPIKE_MULTIPLIER=3
```

### 3. Initialize and seed the database

Make sure MySQL is running, then run:

```powershell
cd backend
node database/init.js
npm run seed
```

The initialization script creates the database and these tables:

- `products`
- `pricing_suggestions`
- `reorder_suggestions`

The seed script inserts the sample products and skips products that already exist by SKU.

## Run the Application

Start the backend in one terminal:

```powershell
cd backend
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

The frontend is served at `http://localhost:5173`.

### Port note

The Vite development proxy currently forwards `/api` requests to `http://localhost:3000`, while the example backend environment file uses port `3001`. Use one of these options:

- Set `PORT=3000` in `backend/.env`, or
- Change the proxy target in `frontend/vite.config.js` to `http://localhost:3001`.

The backend health endpoint is available at `http://localhost:<PORT>/api/health`.

## API Reference

All API responses use JSON.

### Health

```http
GET /api/health
```

### Products

```http
GET    /api/products
GET    /api/products?status=ACTIVE
GET    /api/products?category=ELECTRONICS
POST   /api/products
PATCH  /api/products/:id
PATCH  /api/products/:id/stock
POST   /api/products/:id/orders
GET    /api/products/:id/recommendations
POST   /api/products/:id/suggest-pricing
POST   /api/products/:id/suggest-reorder
```

Example product creation request:

```json
{
  "sku": "PRD-009",
  "name": "Example Product",
  "category": "ELECTRONICS",
  "currentPrice": 29.99,
  "stock": 40,
  "reorderThreshold": 10,
  "demandVelocity": 4,
  "lifecycle": "ACTIVE"
}
```

Example stock update:

```powershell
Invoke-WebRequest `
  -Uri http://localhost:3001/api/products/1/stock `
  -Method PATCH `
  -ContentType "application/json" `
  -Body '{"stock": 8}'
```

When stock falls below the reorder threshold, the backend asynchronously creates inventory-low pricing and reorder suggestions when no pending suggestion already exists.

### Pricing suggestions

```http
PATCH /api/pricing-suggestions/:id
```

Accept or reject a suggestion with:

```json
{
  "status": "ACCEPTED",
  "productId": 1
}
```

Valid statuses are `ACCEPTED` and `REJECTED`.

## Recommendation Rules

Pricing recommendations use these rules:

1. If stock is below the reorder threshold, recommend a 10% price increase.
2. Otherwise, if demand velocity is more than twice the category average, recommend a 5% price increase.
3. Otherwise, hold the current price.

Reorder quantity is calculated as three times the reorder threshold minus current stock, with a minimum recommendation of one unit.

Demand-spike triggers use `DEMAND_SPIKE_MULTIPLIER` multiplied by the category's average demand velocity. The default multiplier is `3`.

## Available Scripts

### Backend

```powershell
npm start       # Start the backend with Node
npm run dev     # Start the backend with nodemon
npm run seed    # Insert sample products
```

### Frontend

```powershell
npm run dev     # Start the Vite development server
npm run build   # Create a production build
npm run preview # Preview the production build locally
```

## Security Notes

- Keep `backend/.env` local and never commit passwords or tokens.
- Use `backend/.env.example` as the shareable configuration template.
- Do not put GitHub tokens, database passwords, or private keys in source files.
- Before pushing changes, review `git diff --cached` and confirm that no secret files are staged.

## Current Scope

The recommendation engine is rule-based. The service interfaces leave room for a future AI-assisted advisor, but no external AI API key is required by the current implementation.
