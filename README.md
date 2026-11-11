# Certora

**Beldex Testnet BNS resolution and recipient-change protection.**

Certora resolves Beldex Name Service (BNS) names through the Beldex Wallet, lets you explicitly approve and pin the resulting destination, and warns you when a later fresh resolution returns a different address. It is a protection layer around recipient selection: it does not send payments and never asks for wallet secrets.

> **Status:** Testnet MVP. Automated tests cover the full flow with a mocked provider. On real Beldex Testnet, the official extension connected and a read-only dry run passed **8/8 validation cases** and **7/7 fresh lookups** (all `name not registered`, zero pins, no signing prompt). **The full BNS change-detection cycle has not been validated on Testnet:** the faucet is CAPTCHA-gated and pays 205 tBDX per 24 h, a one-year BNS registration costs 650 tBDX, and public Testnet has zero BNS records. See [Testnet validation](docs/testnet-validation.md) and the [runbook](docs/testnet-runbook.md).

## Why

A BNS name can resolve to a different address after the owner updates its mapping. Anyone who approved the old address could send funds to an unexpected destination if they do not re-check. Certora turns the previously approved destination into an explicit, local pin and performs a fresh comparison on demand.

Core guarantees:

- **No automatic pin replacement.** A changed destination is only stored after an explicit approval dialog.
- **Fresh resolution on every recheck.** Cached resolution results are never reused for change detection.
- **Failed resolution preserves the pin.** A failed or uncertain lookup yields `RESOLUTION_UNAVAILABLE`; the approved pin is untouched.
- **Testnet only.** Mainnet is blocked for resolution, pinning, and rechecks; Certora never switches networks.
- **Honest verification.** The SDK returns `verified: false`; Certora displays this limitation instead of claiming on-chain verification.
- **No payments, no secrets.** Certora never signs or sends transactions and never requests seed phrases or private keys.

## Requirements

- Node.js 20+ (developed with Node 24) and npm.
- For real use: the **Beldex Wallet browser extension**, unlocked, configured for **Beldex Testnet**, with an owner-controlled BNS name for end-to-end validation.
- A Chromium-based browser is recommended.

## Run locally

```bash
npm install
npm run dev
```

Open the printed local URL. Without the Beldex Wallet extension the app reports that no provider was detected; it does not fabricate a connection.

### Production build

```bash
npm run build
npm run preview
```

The mock wallet is compiled out of production builds.

## Deploy on Vercel

The repository is ready for a direct Vercel import from GitHub; no environment variables are required.

1. In Vercel, choose **Add New → Project** and import `Certorabdx/Certora`.
2. Keep the root directory `./` and the detected **Vite** preset.
3. Install with `npm ci`, build with `npm run build`, and output to `dist`.
4. Deploy. Pushes to `main` create production deployments.

[`vercel.json`](vercel.json) adds the SPA rewrite required by React Router, security headers, and immutable caching for hashed assets. See [Vercel deployment](docs/vercel-deployment.md) for the full checklist, rollback, and boundaries. A Vercel URL is a hosting endpoint, not Testnet validation evidence.

## Tests

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint, zero warnings
npm test              # Vitest unit tests
npm run e2e           # Playwright E2E (mocked wallet)
npm run build         # typecheck + production build
```

Verified in this workspace:

| Check | Result |
|-------|--------|
| TypeScript | Pass |
| ESLint | Pass (0 warnings) |
| Unit tests | 27/27 pass |
| E2E tests | 3/3 pass (mocked provider only) |
| Production build | Pass |
| Real Testnet connection + read-only dry run | Pass — 8/8 validation, 7/7 fresh negative lookups, 0 pins |
| Full Testnet change-detection cycle | **Not performed** — see blockers above |

## Mock mode (development/E2E only)

Appending `?mock=1` in a development build installs a fake wallet provider so UI flows can be exercised without the extension. This mode:

- is disabled outside `import.meta.env.DEV`;
- is exposed on `window.__mockWallet` only for Playwright;
- **is not live testnet evidence** and must never be presented as such.

## Brand and interface

The interface uses a warm near-black palette, Instrument Serif headlines, Geist UI text, Geist Mono for addresses and fingerprints, and a restrained amber accent. Fonts are self-hosted in `public/fonts/`; the app makes no third-party font requests at runtime. The brand mark is a “sealed destination” in `src/components/ui/LogoMark.tsx`, mirrored as static app and PWA icons. If the mark geometry changes, update the SVG and icon set together.

## Screens

- **Overview** — wallet/network status, pinned count, quick resolve, recent activity.
- **Resolve BNS** — validate a name, resolve through the wallet, review the full destination, approve and pin.
- **Protected Recipients** — search approved recipients; open details or remove with confirmation.
- **Recipient Details** — view the approved destination and fingerprint; run a fresh recheck; compare old vs. new; explicitly approve a new destination.
- **Activity** — local session events (connections, pins, rechecks, changes, removals).
- **Settings** — connection details, local pin count, data clearing, trust disclosures, external BNS/testnet links.

## Project structure

```
src/
  components/        UI primitives and layout
  hooks/             useWallet (shared context), useResolver
  state/             CertoraProvider (pins/activity), WalletProvider (single wallet instance)
  screens/           Overview, Resolve, Recipients, RecipientDetails, Activity, Settings
  mockWallet.ts      Development-only fake provider
packages/
  core/              Fingerprint, comparison engine, IndexedDB store, policies, types
  beldex-adapter/    Provider detection, BeldexWeb3 wrapper, BNS resolution, validation
tests/e2e/           Playwright mocked-wallet workflow tests
docs/                Research, architecture, threat model, runbooks, validation status
```

## How the protection works

1. Resolve a BNS name through the connected Beldex Wallet on Testnet.
2. Review the full destination and the resolver-trust disclosure.
3. Approve and pin: Certora stores a SHA-256 fingerprint and the exact destination in IndexedDB, partitioned by wallet account and network.
4. Later, open the recipient and choose **Recheck destination**. Certora performs a fresh resolution (no cached result).
5. If the destination matches, the pin is unchanged. If it changed, both the approved and current destinations are displayed, and the original pin remains intact.
6. Approving the new destination is a separate, explicit action. Only then is the pin updated.

Fingerprint input: `certora-v1` + network + name + mapping type + exact destination (case-preserving).

## Security and limitations

- BNS resolution is performed by the Beldex Wallet's configured resolver. The SDK's `verified` flag is always `false` in v1; Certora cannot independently prove the mapping on-chain.
- Pins are local approval evidence, not identity or authenticity proofs.
- Local pins can be read or altered by anyone with access to the browser profile. They are not a security boundary against a compromised device.
- Certora does not protect against a user approving a malicious address, a compromised wallet/resolver, or malware that changes addresses after approval.
- See [docs/threat-model.md](docs/threat-model.md) for the full threat model and residual risks.

## Documentation

- [Technical research](docs/technical-research.md)
- [Architecture](docs/architecture.md)
- [UI research](docs/ui-research.md)
- [Implementation plan](docs/implementation-plan.md)
- [Execution log](docs/progress.md)
- [Threat model](docs/threat-model.md)
- [Testnet runbook](docs/testnet-runbook.md)
- [Testnet validation status](docs/testnet-validation.md)
- [Repository audit](docs/repository-audit.md)
- [Vercel deployment](docs/vercel-deployment.md)

## Use

MVP; the static build is ready for Vercel, but no hosted deployment has been performed. Testnet only. Do not use with Mainnet funds.
