# Certora Architecture

## Module Boundaries

Certora separates the **Beldex adapter** (provider/wallet/resolver/network interaction) from the **core** (fingerprinting, comparison, recipient storage, policies). The core is independently testable without a real wallet provider.

```
+---------------------+         +---------------------------+
|   React UI Layer    |         |      Certora Core         |
|  (screens, hooks)   |         |  fingerprint / comparison |
+----------+----------+         |  recipient-store (IndexedDB)|
           |                    |  policies / types           |
           v                    +---------------+-------------+
+---------------------+                    |
|   Beldex Adapter    |--------------------+
|  (provider, wallet, |
|   resolver, network)|
+---------------------+
```

### beldex-adapter
Responsible for all actual provider interaction and data conversion:
- `provider.ts` — `detectProvider()`, `BeldexProvider` lifecycle, `PostMessageProvider` wrap.
- `wallet.ts` — `BeldexWeb3` wrapper: connect, disconnect, address/network getters, event subscription, testnet verification.
- `resolver.ts` — `resolveBns(name)`, input validation, response validation, timing, structured `BnsResolution` output.
- `network.ts` — `checkAddress` for testnet-shaped destinations, `Nettype` narrowing.

### core
Pure, provider-independent logic:
- `fingerprint.ts` — SHA-256 fingerprint via Web Crypto API over version + network + name + mappingType + destination.
- `comparison.ts` — exact destination string comparison + fingerprint integrity check, status evaluation.
- `recipient-store.ts` — IndexedDB persistence, partition by account + network, CRUD, removal, clearing, schema versioning.
- `policies.ts` — safety rules: no automatic pin replacement, stale results never approved, failed resolution → RESOLUTION_UNAVAILABLE.
- `types.ts` — shared application-level types (`BnsResolution`, `RecipientPin`, `RecipientStatus`, etc.)

## Data Flow — Resolution
1. User enters a BNS name (e.g. `merchant.bdx`).
2. Adapter validates name (suffix, length, characters).
3. Adapter confirms wallet connected + testnet.
4. Adapter calls `web3.resolveBns(name)`, measures duration.
5. Adapter validates the result (`address` present, testnet-shaped via `checkAddress`).
6. Returns `BnsResolution { name, destination, network: 'testnet', mappingType: 'wallet', verified: false, resolvedAt, durationMs }`.

## Data Flow — Pinning
1. Resolution result displayed in full.
2. Trust limitation disclosed (resolver not independently verified).
3. User explicitly approves.
4. Core computes fingerprint, builds `RecipientPin`, writes to IndexedDB partitioned by `account` + `network`.
5. Activity event recorded.

## Data Flow — Change Detection (Recheck)
1. User selects a protected recipient → fresh `resolveBns(name)` (bypasses app-level cache).
2. Core recomputes current fingerprint, retrieves saved pin.
3. Compares exact destination strings; compares fingerprints as integrity check.
4. Determines `RecipientStatus`: MATCHES_PIN / DESTINATION_CHANGED / RESOLUTION_UNAVAILABLE / etc.
5. Updates `lastCheckedAt`, records activity event.
6. On change: old pin preserved; old + new destinations displayed; explicit reapproval required before pin update.

## Storage Schema
IndexedDB database `certora`, version 1, store `recipientPins`:
- Key: `id` (UUID)
- Indexes: `account`, `network`, `name`
- Fields per `RecipientPin`: id, account, network, name, mappingType, destination, fingerprint, approvedAt, lastCheckedAt
- Partitioned by `account` + `network`; no wallet secrets stored.

## Wallet State Ownership
A single `WalletProvider` (`src/state/WalletProvider.tsx`) owns the adapter, provider detection, connection state, and (in development only) the mock provider. Screens consume `useWallet()` from this context. This prevents multiple adapters/mock instances from disagreeing about connection state or exposing a different mock than the one used by the Resolve screen.

## Safety Policy
- Never silently replace an existing pin.
- A changed destination requires an explicit confirmation dialog; reapproval updates the existing pin in place.
- A failed/uncertain resolution never becomes an approved recipient.
- Mainnet is rejected; testnet required for all write operations.
- Local pins are approval evidence, not authenticity proofs.
- Mock mode is development-only and can never be enabled in a production build.
