# Vercel Deployment

Certora is a static Vite + React SPA. Vercel builds from `main` and serves `dist/`; there is no server runtime, database, or required environment variable.

## Build contract

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `./` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | 20.x or newer |
| Environment Variables | None |

`vercel.json` is the source of truth for the build and hosting behavior:

- **Vite preset** with static output from `dist/`.
- **`npm ci`** for reproducible installs from `package-lock.json`.
- **SPA fallback:** unmatched paths are rewritten to `index.html`, so direct visits to `/resolve`, `/recipients`, `/recipients/:id`, `/activity`, and `/settings` work with React Router.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- **Asset caching:** hashed files under `/assets/` are cached immutably.

No Content-Security-Policy is configured. Test one against the Beldex Wallet extension before enabling it in production.

## First deployment

Import `Certorabdx/Certora` in Vercel. The committed `vercel.json` supplies the settings above; no dashboard overrides or environment variables are required. Production tracks `main`; pull requests get preview deployments.

## Post-deployment verification

1. Open `/`, `/resolve`, `/recipients`, and `/settings` directly; each must load the app rather than return a 404.
2. Confirm the self-hosted fonts and icons load from the deployment.
3. Confirm `?mock=1` has no effect in the production build.
4. Without the extension, confirm the app reports **Wallet not detected** and does not fabricate a connection.
5. With the Beldex Wallet extension on **Testnet**, confirm the connection and the persistent **Beldex Testnet** indicator.
6. Confirm Mainnet does not enable resolution, pinning, or rechecks.

A deployment is not Testnet validation evidence. Use [testnet-runbook.md](testnet-runbook.md) for the real-wallet procedure.

## Rollback

Promote the last known-good deployment in Vercel. Pins are stored locally in the user's browser IndexedDB, so rollback has no data migration.

## Custom domain

Add the domain under **Project → Settings → Domains** and follow Vercel's DNS instructions. The app uses root-relative paths, so no Vite `base` change is required for a domain root.

## Constraints

- No wallet secrets, private keys, seed phrases, or signing capability belong in Vercel settings or environment variables.
- Certora does not send payments or sign transactions.
- Mock mode is compiled out of production builds and must never be presented as live evidence.
