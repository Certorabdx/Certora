# Certora Execution Log

## Environment
- Greenfield build in `C:\Users\HP\Documents\Certora`.
- Node v24.20.0, npm 11.19.0, Windows.
- Repository published at `https://github.com/Certorabdx/Certora` (`main`); no deployment and no real fund movements.

## Phase 0 — Repository audit
- Inspected the workspace: empty directory, no existing work to preserve.
- Created `docs/repository-audit.md`.

## Phase 1 — Beldex technical research
- Installed and inspected `@bdxi/web3js` **1.0.2**.
- Confirmed API: `detectProvider()`, `BeldexWeb3` (`connect`, `disconnect`, `getAddress`, `getNetwork`, `getState`, `resolveBns`, `on/off`), `ResolveBnsResult { name, address, verified: false }`, `Nettype = 'mainnet' | 'testnet'`, `checkAddress`, `BdxRpcError`.
- Confirmed trust limitation: `verified` is always `false` in v1; resolution trusts the wallet's configured HTTPS resolver, not an on-chain proof.
- Created `docs/technical-research.md`.

## Phase 2 — Architecture and UI research
- Created `docs/architecture.md` and `docs/ui-research.md`.

## Phase 3 — Application foundation
- Scaffolded React 18.3.1 + TypeScript 5.6.3 + Vite 5.4.11 + Tailwind 3.4.17.
- Implemented design tokens, desktop sidebar, mobile header, wallet header, Testnet indicators, toasts, dialogs, empty/loading states, and routing.

## Phase 4 — Core and Beldex adapter
- `packages/core`: types, SHA-256 fingerprint (`certora-v1`), comparison/status engine, IndexedDB store, policies.
- `packages/beldex-adapter`: provider detection, `BeldexWalletAdapter`, BNS name validation, `resolveBns`, testnet address checks.
- Pins partitioned by account + network; failed resolution preserves the pin.

## Phase 5 — Product screens
- Implemented Overview, Resolve BNS, Protected Recipients, Recipient Details, Activity, Settings.
- No payments or signing; no wallet secrets requested.
- Mainnet is rejected; the app never silently switches networks.

## Phase 6 — Wallet-state refactor
- Found a real bug: `useWallet()` was instantiated separately by every screen, creating one adapter and one mock wallet per component. `window.__mockWallet` could point to a different instance than the Resolve screen used, and screens could disagree about connection state.
- Added a single `WalletProvider` context (`src/state/WalletProvider.tsx`); `useWallet()` now consumes it. Only one adapter/mock exists for the app.
- Gated mock mode behind `import.meta.env.DEV` so it is compiled out of production builds.
- Removed debug logging from `packages/core/src/recipient-store.ts` and deleted leftover debug scripts.

## Phase 7 — UI corrections
- Fixed the desktop shell: the header previously sat beside the sidebar instead of above the content; mobile showed the persistent sidebar over content.
- Removed the dead notification button; added a working header Connect action.
- Fixed literal `&amp;` rendering in the approve button/confirmation.
- Fixed the initial “Enter a BNS name” error showing before any input.
- Fixed “Not pinned” being shown for an already-pinned recipient; now “Not rechecked yet”.
- Prevented the reapproval dialog from opening automatically on detection; explicit review is required.
- Reapproval now updates the existing pin in place and stays on the details screen instead of add/remove churn and navigation.
- Failed rechecks now surface `RESOLUTION_UNAVAILABLE` and preserve the pin (previously the UI could fall back to a neutral state).
- Added confirmation dialogs for recipient removal (recipients list and details) and wallet disconnect.
- Improved toast icons/colors, empty-state icons, responsive headers, mobile Testnet badge, capitalization, and button wrapping; moved toasts to the bottom-right so they no longer cover header actions, and clear stale toasts on recheck/reapproval.
- Added copy-failure feedback instead of an unhandled clipboard rejection.
- Activity page now shows all session events; Overview shows the latest 10.

## Phase 8 — Automated verification (2026-11-10)
- `npx tsc --noEmit` — pass.
- `npx eslint src packages tests --ext ts,tsx --max-warnings 0` — pass, 0 warnings.
- `npx vitest run` — 4 files, **26/26 tests pass** (baseline before the Phase 12 regression test; now 27/27):
  - fingerprint 3
  - comparison 9
  - recipient store 7
  - resolver validation 7
- `npm run build` — pass (production bundle generated in `dist/`).
- `npx playwright test --reporter=line` — **3/3 mock-provider E2E tests pass**:
  1. connect/resolve/pin/list;
  2. destination change detection, old-pin preservation, explicit reapproval, final match;
  3. Testnet indicator.
- Browser console review: only React Router v7 future-flag warnings; no runtime errors.

## Phase 9 — Documentation
- Created `docs/threat-model.md`, `docs/testnet-runbook.md`, `docs/testnet-validation.md`, and `README.md`.
- Updated `docs/architecture.md`, `docs/implementation-plan.md`, and this log.

## Phase 10 — UI rebuild and brand identity (2026-11-10)
- Studied comparable products for interaction and visual patterns: ENS, Uniswap, Rabby, Phantom, Safe, Linear, Rainbow, Revoke.cash, and Family.
- Rebuilt the visual system around a “warm private ledger” direction: near-black warm surfaces, Instrument Serif headlines, Geist for UI text, Geist Mono for addresses and fingerprints, restrained amber accent, calm status pills, and soft rounded surfaces.
- Added self-hosted woff2 fonts under `public/fonts/` loaded via `@font-face`; the app makes no third-party font requests at runtime.
- Redesigned the shell, sidebar, header, footer, 404 page, and all UI primitives, then rewrote Overview, Resolve BNS, Protected Recipients, Recipient Details, Activity, and Settings on the new system.
- Preserved every E2E-critical label, heading, and link name so the existing Playwright flow still passes unchanged.
- Designed a real brand mark, “sealed destination”: a scalloped wax-seal silhouette with a masked destination-pin cutout. Implemented as the reusable `LogoMark` component and used in the sidebar/drawer, compact mobile header, and Overview watermark.
- Generated the app icon set from the same geometry: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `site.webmanifest`.
- Fixed a real mobile layout collision found during screenshot review: the full logo lockup overlapped the wallet chip, so mobile now uses the compact mark while desktop and the drawer keep the full lockup.
- Captured desktop and mobile screenshots in mock mode for visual review. These are design evidence only, not Testnet evidence.
- Re-ran verification after the redesign and brand work:
  - `npx tsc --noEmit` — pass.
  - ESLint — pass, 0 warnings.
  - Vitest — **26/26 tests pass** (at that time; now 27/27).
  - Playwright — **3/3 mock-provider E2E tests pass**.
  - `npm run build` — pass; mock-wallet strings verified absent from the production bundle; fonts and icons present in `dist/`.

## Phase 11 — Real Testnet attempt (2026-11-10)
- User authorized creating a temporary Testnet address and obtaining faucet funds for an end-to-end run.
- Downloaded the official **Beldex Wallet** extension **1.0.4** from the Chrome Web Store (CRX), loaded it unpacked into an isolated temporary Playwright profile outside the repository.
- Created a temporary non-custodial account and switched it from Mainnet to Testnet inside the extension. Public Testnet address:
  `9utBPU6ot84SbArKiRBkF8f2dpxpqbwqyFhKoK9MmKQVP7zePQHqMwKCfyCMbAWBanc2jywkpUPQ6NUg9Gxk7xd67MbMQai`
- Connected Certora (no `?mock=1`) to the real extension and approved the connection in the wallet. Certora displayed the real Testnet address and **Beldex Testnet**.
- Ran a real BNS lookup for `merchant.bdx`. It returned `BNS resolution failed: name not registered`; no pin was created. This is a real negative lookup, not a positive resolution.
- Verified the result against the network: Testnet daemon at height **4,342,034** reported `nettype: "testnet"` and `bns_counts: 0`; the Testnet BNS API returned every queried name as available.
- Connected the real extension to `https://faucet.beldex.dev` and shared the Testnet address. The faucet request could **not** be submitted: Cloudflare Turnstile stayed on `Loading CAPTCHA...` and issued no token after 36 s. The CAPTCHA was not bypassed.
- Established two independent blockers for full validation:
  - The faucet pays **205 tBDX per address/IP/24 h**.
  - `Beldex-Coin/beldex` `src/beldex_economy.h` sets the HF18+ one-year BNS fee to 500 BDX + 30% = **650 tBDX**; Testnet shortens the registration duration, not the price.
- Balance remained **0 tBDX**. No BNS name was registered, no mapping was updated, and no transaction was sent.
- Rewrote `docs/testnet-validation.md` with the partial live evidence and exact blockers; updated `README.md` and `docs/testnet-runbook.md` accordingly.
- No code changes were required; the previously verified 26 unit tests (now 27/27), 3 mock E2E tests, and production build remained the code-verification baseline.

## Phase 12 — Read-only Testnet dry run (2026-11-10)
- Ran a real, read-only validation matrix against Beldex Testnet through the official extension. No faucet funds, transactions, or signing were involved.
- Instrumented `window.postMessage` to observe the actual SDK/wallet RPC traffic, including separate request and response envelopes.
- **Validation matrix — 8/8 pass, 0 wallet requests:**
  - empty input, missing `.bdx` suffix, uppercase name, space in name, Cyrillic homoglyph, consecutive hyphens, empty label, over-maximum length.
  - Each invalid input disabled **Resolve** and showed the expected inline reason.
- **Real lookups — 7/7 pass, 7 fresh `bdx_resolveBns` RPCs with 7 unique request IDs:**
  - `merchant.bdx` (twice), `bob.bdx`, `toretto.bdx`, `my-shop.bdx`, `a.bdx`, and `  merchant.bdx  ` (trim behavior).
  - Every lookup returned `name not registered`; every one surfaced `Resolution failed` / `BNS resolution failed: name not registered`.
  - Wallet round-trip latency ranged from **716 ms to 1,492 ms**. The repeated `merchant.bdx` lookup issued a second distinct RPC (1,492 ms then 716 ms), confirming the app does not reuse a cached result.
- No resolution receipt and no **Approve & pin recipient** control appeared for any failed lookup.
- **No pins created:** `recipientPins` IndexedDB count was **0**, the recipients page still showed its empty state, and no approval/signing prompt appeared in the wallet during lookups.
- **Disconnect/reconnect:** the Settings disconnect control worked, the app returned to the connect-required state, and reapproval in the real extension restored the Testnet session.
- **Zero browser console errors and zero page errors** during the run.
- Found and fixed one real validation bug: `Merchant.BDX` was rejected with the misleading message “BNS names must end with .bdx” because the suffix check was case-sensitive. The validator now checks the suffix case-insensitively and reports “Use only lowercase letters, numbers, and hyphens.” Added a regression test.
- Re-ran verification after the fix:
  - `npx tsc --noEmit` — pass.
  - ESLint — pass, 0 warnings.
  - Vitest — **27/27 tests pass**.
  - Playwright — **3/3 mock-provider E2E tests pass**.
  - `npm run build` — pass; mock strings absent from the production JS bundle.
- Evidence artifacts are in the temporary folder outside the repo (`dry-test-results.json` and `dry-*.png`). They are read-only Testnet evidence, not proof of a completed BNS change cycle.

## Phase 13 — Final documentation polish (2026-11-10)
- Audited `README.md` and every file in `docs/` against the current code and recorded evidence.
- Removed stale claims: non-existent `network.ts`, `PostMessageProvider` references, “no live Testnet validation”, “no Git history”, and obsolete test counts.
- Corrected the architecture and resolution flow to match the code: the UI gates wallet/Testnet before calling the adapter, and the address shape check is informational and non-blocking.
- Updated the UI research document to the implemented warm near-black palette and Instrument Serif / Geist / Geist Mono typography.
- Updated the implementation checklist, runbook status, repository audit, and validation report to the published-repository state.
- Documentation-only change; no application code or behavior changed.

## Phase 14 — Vercel deployment preparation (2026-11-11)
- Added `vercel.json`: Vite framework preset, `npm ci`, `npm run build`, `dist` output, SPA rewrite to `/index.html`, security headers, and immutable caching for hashed `/assets/` files.
- Created `docs/vercel-deployment.md` with the build contract, post-deployment checks, boundaries, rollback, and custom-domain notes.
- Kept deployment instructions out of `README.md`; the README remains focused on the product, local development, and verification.
- No Content-Security-Policy is set yet; it must be tested against the Beldex Wallet extension before enabling.
- No deployment was performed. Importing the repository requires the owner's Vercel account.
- Re-ran the production build and configuration validation after adding the deployment files.

## Outstanding
- **Full real Beldex Testnet BNS validation remains unperformed.** A live wallet connection, a read-only dry run, and real negative BNS lookups were obtained, but there is still no owner-controlled Testnet BNS name, funded balance, mapping update, transaction hash, explorer link, or detected change/reapproval cycle.
- Remaining blockers: the faucet Turnstile challenge requires human interaction, the faucet pays 205 tBDX per 24 h versus a 650 tBDX one-year BNS fee, and public Testnet currently has zero BNS records.
- To complete validation, fund the temporary address with **≥650 tBDX plus fees** (or manually solve the faucet CAPTCHA across multiple days, which still does not solve the zero-name problem), register a Testnet BNS name, then follow `docs/testnet-runbook.md` and record the real transaction hash and explorer link in `docs/testnet-validation.md`.
- The mock E2E tests verify UI/workflow wiring only and are explicitly not live evidence.
- No deployment or real fund movements occurred. Repository: `https://github.com/Certorabdx/Certora`.
