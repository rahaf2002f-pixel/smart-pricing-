# Vercel deployment

This project is a Vite/React frontend plus an Express API, not a static-only app.
Use the repository root (the directory containing `package.json` and
`vercel.json`), **not** `client`, as Vercel's Root Directory.

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `client/dist` |

Vite intentionally builds into `client/dist`, configured in `client/vite.config.js`.
There is no root-level `dist`. Keep that path consistent with the standalone
Express production server, which also serves `client/dist`.

`vercel.json` declares these settings, routes `/api/*` to `api/handler.js`, and
routes frontend navigation to `index.html`. Vercel serves built assets directly.
The function imports the existing Express app and all existing routes. It reuses
MongoDB connections and awaits account/index initialization before serving API
requests. It does **not** launch a listening server or Vite.

## Private environment variables

In Vercel: **Project → Settings → Environment Variables**, add:

- `MONGODB_URI`: the existing Atlas connection string.
- `OPENROUTER_API_KEY`: the existing private OpenRouter key.
- `OPENROUTER_MODEL`: optional; omit to keep the current default model.
- `SESSION_SECRET`: retain this if configured for the project.

Select **Production**, and **Preview** if you also use preview deployments.
Replit Secrets do not automatically configure an unrelated Vercel project.
Never put these values in `vercel.json`, Git, browser code, or a `VITE_*` variable.
Vercel supplies `NODE_ENV=production`; do not configure `PORT` there.

Ensure Atlas network access permits connections from the deployed Vercel runtime.
If Atlas blocks the deployment, check Atlas **Security → Network Access** and use
an appropriate allowed egress IP or supported private-network/static-egress
configuration. Avoid opening the database to all IPs unnecessarily.

After saving the settings and uploading/pushing these files, use Vercel's
**Deployments → latest deployment → Redeploy**. Build settings and environment
changes take effect on the new deployment, not an already-running one.

## Verification

Locally: `npm run build`, then check `client/dist/index.html` and
`client/dist/assets`. `npm test` covers existing application logic.

`node scripts/verify-vercel.mjs` starts the actual serverless handler behind a
temporary local HTTP listener, verifies database health, session login/logout,
account isolation and an authenticated OpenRouter request. It creates and cleans
up only its own temporary test accounts.

After publishing, verify `/api/health` returns HTTP 200 with
`"database":"connected"`, then test sign-in, saving a product, language selection,
notifications and AI advice on the Vercel URL. Local tests cannot prove that the
Vercel project's environment variables or Atlas network access are configured.
