# Smart Pricing AI — MERN MVP

## Run

Run `npm run dev` (or use the **Start application** workflow) to start the
Vite + React client and Express API on port 5000.
Run `npm test` for the pricing calculation checks and `npm run build` to build
the frontend.

## Product scope

- Preserve the four imported Stitch screens and their basic design. Navigation
  shows only the selected screen or subsection, immediately from the top, without
  scrolling through earlier screens. Preserve entered values when switching
  destinations and support browser back/forward navigation.
- Calculate per-item and batch costs, expected profit, margin, and suggested
  selling prices using purchase, packaging, delivery, fixed or percentage-based
  payment fees, marketing, operational, and custom costs.
- Save session-level default delivery and payment fees; override them per product.
- Compare prices with a live slider and simulate discount impact on profit.
- Optional OpenRouter advice explains server-calculated pricing results. Add
  `OPENROUTER_API_KEY` in Replit Secrets to enable this optional feature.
- Compare selling prices and save, edit, search, filter, and delete the current
  browser session's products. Export the catalog as CSV or print it to PDF.
- Registration is shown below the homepage introduction. A visitor must register
  or sign in before using pricing tools; enforce this on the server as well as
  in navigation. Completed accounts never repeat registration.
- Register with full name, email, and password; MongoDB
  stores a unique normalized email, salted scrypt hash and completed-profile state.
  Account details are entered once; later logins show the saved profile, with
  explicit editing available. Product entry forms must remain available normally.
- Account calculations, settings and products are owned by the authenticated User
  ID, resolved by the server. Legacy anonymous records remain untouched in MongoDB
  and are not automatically imported into an account.
- Sessions use HttpOnly cookies and hashed tokens in MongoDB, with a seven-day
  expiry. Passwords and authentication tokens must never be logged.

## Vercel

- Deploy from the repository root using `vercel.json`: `npm run build` outputs
  `client/dist` (not root `dist`); `npm ci` is the install command.
- Keep Replit's existing Express/Vite workflow unchanged. Vercel uses
  `api/handler.js` with cached MongoDB initialization and the existing Express
  routes. See `docs/vercel.md` for private environment setup and verification.

## Languages

- Visual refinements keep the original logo and navy/mint palette. Account-entry
  controls are compact but retain 44px touch areas and 16px mobile input text.

- The same application supports Arabic (default, RTL) and English (LTR).
  Static UI catalogs live in `client/src/i18n/locales/`; API message translations
  live in `shared/i18n/messages.js`. Add both translations for every new UI message.
- Guest language is stored in the browser. Authenticated language changes are
  persisted to the user's MongoDB record via `PATCH /api/auth/preferences`.
  A saved account preference takes precedence on sign-in; logout keeps the current
  browser language. Changing language must never remount forms or change values.
- API requests send `Accept-Language`. Only public response messages/errors are
  localized; user-entered names, categories and numeric data remain unchanged.
  OpenRouter advice is requested in the current language without changing metrics.

## Notifications

- The header bell displays real account, product, save, validation, loss/margin
  and AI events. Account notifications/read state are owned by User ID in MongoDB.
- Unique `(userId,eventKey)` indexes prevent repeat events. Deletion is soft:
  the tombstone prevents a refresh/retried event from recreating a deleted alert.
  Calculator autosave and comparison warnings coalesce once per day per type.
- Updates are event-driven after operations, on opening the bell, manual refresh
  and throttled window focus/visibility; there is no continuous polling or claim
  of real-time delivery. The feed supports pagination and unread counts.
- Guest login/validation errors and failed notification writes are explicitly
  local-only. Logged-in failed writes are retried from memory on refresh/focus.
  Offline notices cannot be saved to MongoDB until connectivity returns.
- The user requested a clearly labelled test notification. It is created once
  per account (or shown once per guest tab); it never claims a real financial
  event. The panel's explicit test button can re-enable that same demo record
  without creating duplicates. Normal deleted events remain tombstoned.
- APIs: `GET /api/notifications`, `PATCH /api/notifications/read-all`,
  `PATCH /api/notifications/:id/read`, `DELETE /api/notifications/:id`,
  `POST /api/notifications/client-events` (only whitelisted error event codes).

## MongoDB connection

Set `MONGODB_URI` in Replit Secrets before expecting persistent storage. For local
development, copy `.env.example` to `.env` and set the Atlas connection URI there.
Never commit `.env`; the project ignores it. `GET /api/health` reports whether
MongoDB is connected. Without a URI, calculations still work in the browser, but
saving/restoring them is unavailable.

## API

- `GET /api/health`
- `GET /api/pricing/calculations/:sessionId`
- `PUT /api/pricing/calculations/:sessionId`
- `GET /api/pricing/settings/:sessionId`
- `PUT /api/pricing/settings/:sessionId`
- `POST /api/pricing/advice/:sessionId`
- `GET /api/pricing/products/:sessionId`
- `POST /api/pricing/products/:sessionId`
- `PUT /api/pricing/products/:sessionId/:productId`
- `DELETE /api/pricing/products/:sessionId/:productId`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`, `PATCH /api/auth/profile`

Run `node scripts/verify-accounts.mjs` against the development app for real Atlas
account/isolation checks. It creates uniquely named test accounts and cleans up
only its own records.

## OpenRouter configuration

Set `OPENROUTER_API_KEY` in Replit Secrets to enable AI explanations. The app
calculates all prices, fees, margins, and discounts itself; OpenRouter only
explains the resulting metrics. The default model is `google/gemini-3.1-flash-lite`;
set
`OPENROUTER_MODEL` to choose another OpenRouter model.

## Imported reference files

The original HTML pages, screenshots, `calculated_mint/DESIGN.md`, and
`server.py` remain untouched as reference material. The active application
workflow now uses the MERN MVP.
