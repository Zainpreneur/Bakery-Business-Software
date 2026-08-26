# 🥖 Crumb & Co. — Bakery Business Software

A full-stack management application for running a bakery: recipes & ingredients,
inventory tracking, orders & point-of-sale, customers, suppliers, expenses, and a
reporting dashboard.

## Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, SQLite, JWT auth
- **Frontend:** React 19, TypeScript, Vite, React Router, Tailwind CSS v4, Recharts
- **Monorepo:** npm workspaces (`server/`, `client/`)

## Features

- **Auth & roles** — JWT login, ADMIN / MANAGER / STAFF roles, team management (admin-only)
- **Products & recipes** — define menu items and the exact ingredient quantities each one consumes
- **Inventory** — ingredient stock levels, cost per unit, reorder thresholds, low-stock alerts,
  and a full stock-movement ledger (purchases, usage, adjustments, waste)
- **Orders & POS** — build an order from your product catalog, auto-computed totals,
  automatic ingredient stock deduction based on recipes (with insufficient-stock protection),
  order status workflow (Pending → In Progress → Ready → Completed, or Cancelled with
  automatic ingredient restock), and payment tracking (Unpaid / Partial / Paid)
- **Customers** — CRM with order history and search
- **Suppliers** — who you buy ingredients from
- **Expenses** — rent, utilities, equipment, etc., for a full profitability picture
- **Dashboard** — revenue today/week/month, 30-day revenue trend, top-selling products,
  low-stock alerts, and a net-income snapshot

## Getting Started

### Prerequisites

- Node.js 18+

### Setup

```bash
npm install
cp server/.env.example server/.env   # edit JWT_SECRET etc. if desired
npm run db:migrate                   # creates the SQLite database & schema
npm run seed                         # loads demo data (products, ingredients, orders…)
```

### Run (dev)

```bash
npm run dev
```

This starts the API on **http://localhost:4000** and the frontend on
**http://localhost:5173** (Vite proxies `/api` to the backend). Open the frontend
in your browser and sign in with one of the seeded demo accounts:

| Email                | Password   | Role  |
| --------------------- | ---------- | ----- |
| admin@bakery.test     | admin123   | ADMIN |
| staff@bakery.test     | staff123   | STAFF |

### Build for production

```bash
npm run build
```

Builds the server to `server/dist` and the client to `client/dist`. Serve the
client's static build with any static host / reverse proxy, and run
`node server/dist/index.js` (with a proper `.env`) for the API.

## Project Structure

```
server/               Express + TypeScript API
  prisma/schema.prisma   Data model (users, customers, suppliers, ingredients,
                         products, recipes, orders, inventory transactions, expenses)
  prisma/seed.ts         Demo data seed script
  src/routes/            REST endpoints, grouped by resource
  src/middleware/        JWT auth + role guards, centralized error handling
client/               React + Vite frontend
  src/pages/             One page per feature area
  src/components/        Shared UI kit (Button, Modal, Card, Badge, …) + app Layout
  src/context/            Auth context (JWT session)
  src/api/                Axios client with auth header injection
```

## Notes

- SQLite is used for zero-config local development. Prisma's `datasource` block can be
  swapped to PostgreSQL/MySQL for production by changing `provider` and `DATABASE_URL`.
- Enum-like fields (order status, roles, etc.) are plain `String` columns in the Prisma
  schema (SQLite has no native enum type) but are validated with Zod at the API layer.
