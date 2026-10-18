# Smart Pricing AI — MERN MVP

## Run

Run `npm run dev` (or use the **Start application** workflow) to start the
Vite + React client and Express API on port 5000.
Run `npm test` for the pricing calculation checks and `npm run build` to build
the frontend.

## MVP features

- Enter product purchase, packaging, delivery, and payment costs.
- Calculate total cost, target-margin selling price, expected profit, and margin.
- Change a comparison selling price and see its estimated profit and margin.
- Keep the current anonymous calculation in MongoDB and restore it in the same
  browser after a refresh. There is no account or calculation-history UI.

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

## Imported reference files

The original HTML pages, screenshots, `calculated_mint/DESIGN.md`, and
`server.py` remain untouched as reference material. The active application
workflow now uses the MERN MVP.
