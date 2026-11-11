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
- **Identity-aware comparison.** A pin matches only when the name (case-insensitive), mapping type, network, exact destination, and fingerprint all agree. Name or fingerprint differences surface as `IDENTITY_MISMATCH` rather than an invitation to overwrite the record.
- **One pin per name.** The store rejects a second pin for the same wallet account, network, and name inside the same IndexedDB transaction.
- **Testnet only.** Mainnet and unrecognized networks are rejected at the adapter, provider, and storage boundaries. The raw wallet network is never coerced to Testnet, and Certora never switches networks.
- **Honest verification.** The SDK returns `verified: false`; Certora displays this limitation instead of claiming on-chain verification.
- **No payments, no secrets.** Certora never signs or sends transactions and never requests seed phrases or private keys.

## Requirements

- Node.js 20+ (developed with Node 24) and npm.
- For real use: the **Beldex Wallet browser extension**, unlocked, configured for **Beldex Testnet**, with an owner-controlled BNS name for end-to-end validation.
- A Chromium-based browser is recommended.

## Run locally

```bash
npm ci
npm run dev
```

Open the printed local URL. Without the Beldex Wallet extension the app reports that no provider was detected; it does not fabricate a connection.

### Production build

```bash
npm run build
npm run preview
```

## Tests

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint, zero warnings
npm test              # Vitest unit tests
npm run e2e           # Playwright E2E (mocked wallet)
npm run build         # typecheck + production build
```

First E2E run: `npx playwright install chromium`.

Current verification:

| Check | Result |
|-------|--------|
| TypeScript | Pass |
| ESLint | Pass (0 warnings) |
| Unit tests | 60/60 pass (6 files) |
| E2E tests | 8/8 pass (mocked provider only) |
| Production build | Pass |
| Production dependency audit | `npm audit --omit=dev`: 0 high/critical; 2 moderate React Router 6.x advisories whose fixes require a v7 major upgrade |
| Real Testnet connection + read-only dry run | Pass — 8/8 validation, 7/7 fresh negative lookups, 0 pins |
| Full Testnet change-detection cycle | **Not performed** — see blockers above |

## Mock mode (development/E2E only)

Appending `?mock=1` in a development build installs a fake wallet provider so UI flows can be exercised without the extension. This mode:

- is disabled outside `import.meta.env.DEV`;
- is fixed when the page loads, so in-app navigation cannot enable or disable it mid-session;
- is exposed on `window.__mockWallet` only for Playwright;
- **is not live testnet evidence** and must never be presented as such.

## Brand and interface

The interface uses a warm near-black palette, Instrument Serif headlines, Geist UI text, Geist Mono for addresses and fingerprints, and a restrained amber accent. Fonts and icons are self-hosted; the brand mark lives in `src/components/ui/LogoMark.tsx` and is mirrored in the static app and PWA icons. Update both together if the mark changes.

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
3. Approve and pin: Certora stores a SHA-256 fingerprint and the exact destination in IndexedDB, partitioned by wallet account and network. Duplicate pins for the same account, network, and name are rejected transactionally.
4. Later, open the recipient and choose **Recheck destination**. Certora performs a fresh resolution (no cached result).
5. If the identity, network, destination, and fingerprint match, the pin is unchanged. If the destination changed, both the approved and current destinations are displayed, and the original pin remains intact. If the name, mapping type, network, or fingerprint differs, the result is shown as a mismatch and the pin is preserved.
6. Approving a changed destination is a separate, explicit action. Only then is the existing pin updated; a reapproval can never change the pinned name or mapping type.

Fingerprint input: `certora-v1` + network + name + mapping type + exact destination (case-preserving).

## Security and limitations

- BNS resolution is performed by the Beldex Wallet's configured resolver. The SDK's `verified` flag is always `false` in v1; Certora cannot independently prove the mapping on-chain.
- Pins are local approval evidence, not identity or authenticity proofs.
- Local pins can be read or altered by anyone with access to the browser profile. They are not a security boundary against a compromised device.
- Certora does not protect against a user approving a malicious address, a compromised wallet/resolver, or malware that changes addresses after approval.
- See [docs/threat-model.md](docs/threat-model.md) for the full threat model and residual risks.

## Documentation

- [Architecture](docs/architecture.md)
- [Technical research](docs/technical-research.md)
- [Threat model](docs/threat-model.md)
- [Testnet runbook](docs/testnet-runbook.md)
- [Testnet validation](docs/testnet-validation.md)

## Use

MVP; Testnet only. Do not use with Mainnet funds.
