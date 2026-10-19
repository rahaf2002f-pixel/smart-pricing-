# Smart Pricing AI — MERN MVP

## Run

Run `npm run dev` (or use the **Start application** workflow) to start the
Vite + React client and Express API on port 5000.
Run `npm test` for the pricing calculation checks and `npm run build` to build
the frontend.

## Product scope

- The four imported Stitch screens are presented vertically in this order:
  start, pricing calculator, detailed product pricing, and product catalog.
- Calculate per-item and batch costs, expected profit, margin, and suggested
  selling prices using purchase, packaging, delivery, payment, marketing,
  operational, and custom costs.
- Compare selling prices and save, edit, search, filter, and delete the current
  browser session's products. Export the catalog as CSV or print it to PDF.
- The app remains anonymous: each browser session stores its calculation and
  product catalog separately. There are no accounts or shared store profiles.

## MongoDB configuration

Set `MONGODB_URI` in Replit Secrets before expecting persistent storage. For local
development, copy `.env.example` to `.env` and set the Atlas connection URI there.
Never commit `.env`; the project ignores it. `GET /api/health` reports whether
MongoDB is connected. Without a URI, calculations still work in the browser, but
saving/restoring them is unavailable.

## API

- `GET /api/health`
- `GET /api/pricing/calculations/:sessionId`
- `PUT /api/pricing/calculations/:sessionId`
- `GET /api/pricing/products/:sessionId`
- `POST /api/pricing/products/:sessionId`
- `PUT /api/pricing/products/:sessionId/:productId`
- `DELETE /api/pricing/products/:sessionId/:productId`

## Imported reference files

The original HTML pages, screenshots, `calculated_mint/DESIGN.md`, and
`server.py` remain untouched as reference material. The active application
workflow now uses the MERN MVP.
