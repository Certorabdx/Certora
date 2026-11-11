# Vercel Deployment

Certora is a static Vite + React SPA. Vercel builds it from the repository and serves `dist/`; there is no server runtime, database, or required environment variable.

## Import from GitHub

1. Push the repository to GitHub (`main`).
2. Open the [Vercel dashboard](https://vercel.com/dashboard) and choose **Add New → Project**.
3. Import `Certorabdx/Certora`.
4. Keep the root directory as `./`.
5. Vercel auto-detects **Vite** and reads `vercel.json`.
6. Confirm the settings:

   | Setting | Value |
   |---------|-------|
   | Framework Preset | Vite |
   | Install Command | `npm ci` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Node.js Version | 20.x or newer |
   | Environment Variables | None |

7. Click **Deploy**.

Every push to `main` will create a new production deployment. Pull requests get preview deployments.

## What `vercel.json` configures

- **Vite framework preset** and static output from `dist/`.
- **`npm ci`** for reproducible installs from `package-lock.json`.
- **SPA fallback:** every unmatched path is rewritten to `index.html`, so direct visits to `/resolve`, `/recipients`, `/recipients/:id`, `/activity`, and `/settings` work with React Router.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- **Asset caching:** hashed files under `/assets/` are cached immutably.

No Content-Security-Policy is set yet. Add and test one against the Beldex Wallet extension before enabling it in production.

## Post-deploy checks

1. Open `/`, `/resolve`, `/recipients`, and `/settings` directly; each should load the app, not a 404.
2. Confirm fonts and icons load from the deployment (they are self-hosted).
3. Confirm the page does not expose `?mock=1` behavior in production.
4. Without the extension, confirm the app reports **Wallet not detected** and does not fabricate a connection.
5. With the Beldex Wallet extension on **Testnet**, confirm the connection and the persistent **Beldex Testnet** indicator.
6. Confirm Mainnet does not enable resolution, pinning, or rechecks.

## Deployment boundaries

- A Vercel deployment is **not** Testnet validation evidence. Use the procedure in [testnet-runbook.md](testnet-runbook.md) for real wallet evidence.
- Mock mode is compiled out of production builds and must never be presented as live evidence.
- No wallet secrets, private keys, seed phrases, or signing capability belong in Vercel settings or environment variables.
- Certora does not send payments or sign transactions.

## Rollback

In the Vercel project, open **Deployments**, select the last known-good deployment, and promote it. No data migration is involved because pins are stored locally in the user's browser.

## Custom domain

Add the domain under **Project → Settings → Domains**, then follow Vercel's DNS instructions. The app uses root-relative paths, so no Vite `base` change is required for a domain root.
