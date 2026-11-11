# Certora Architecture

## Module Boundaries

Certora separates the **Beldex adapter** (provider, wallet, and resolver interaction) from the **core** (fingerprinting, comparison, recipient storage, policies). The core is independently testable without a real wallet provider.

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
|      resolver)      |
+---------------------+
```

### beldex-adapter
Responsible for all actual provider interaction and data conversion:
- `provider.ts` — `discoverProvider()` (wraps the SDK's `detectProvider()` with a timeout) and `normalizeError()` for structured adapter errors.
- `wallet.ts` — `BeldexWeb3` wrapper: connect, disconnect, address/network getters, and event subscription. Every state transition produces a new immutable connection snapshot. The adapter models `mainnet`/`unknown` explicitly and never coerces them to Testnet.
- `resolver.ts` — `resolveBns(web3, name, network)`, input validation, response validation, timing, structured `BnsResolution` output. The resolver requires Testnet before and after the provider call, rejects a different resolved name, and blocks any destination that fails `checkAddress(..., 'testnet')`.

### core
Pure, provider-independent logic:
- `fingerprint.ts` — SHA-256 fingerprint via Web Crypto API over version + network + name + mappingType + destination.
- `comparison.ts` — identity-aware comparison: case-insensitive name, mapping type, network, exact destination, and fingerprint. Returns `MATCHES_PIN`, `DESTINATION_CHANGED`, `IDENTITY_MISMATCH`, `NETWORK_MISMATCH`, `UNPINNED`, or `RESOLUTION_UNAVAILABLE`.
- `recipient-store.ts` — IndexedDB persistence, partition by account + network, CRUD, removal, clearing, schema versioning. Runtime guards reject non-Testnet records; duplicate account + network + name writes are rejected inside one transaction; clear/update/remove resolve only after the transaction commits.
- `policies.ts` — central status ordering and safety rules: resolution availability → network → identity → destination → fingerprint. Failed/uncertain results never become approved recipients.
- `types.ts` — shared application-level types (`WalletNetwork`, `BnsResolution`, `RecipientPin`, `RecipientStatus`, etc.)

## Data Flow — Resolution
1. User enters a BNS name (e.g. `merchant.bdx`).
2. `useResolver` requires a connected wallet and Testnet; otherwise it returns an error without calling the adapter. Invalid input clears any previous resolution, and a newer request, wallet change, or unmount invalidates an in-flight result.
3. Adapter validates the name (suffix, length, characters).
4. Adapter reads the provider network and requires Testnet before resolving.
5. Adapter calls `web3.resolveBns(name)` and measures duration.
6. Adapter re-reads the provider network after the call. A network change during resolution fails the result.
7. Adapter requires an address, rejects a resolved name that differs from the requested name, and blocks a destination that fails `checkAddress(address, 'testnet')`.
8. Returns `BnsResolution { name, destination, network: 'testnet', mappingType: 'wallet', verified: false, resolvedAt, durationMs }`.

## Data Flow — Pinning
1. Resolution result displayed in full.
2. Trust limitation disclosed (resolver not independently verified).
3. User explicitly approves.
4. Core computes fingerprint, builds `RecipientPin`, and writes it in one read/write transaction partitioned by `account` + `network`. A second pin for the same account, network, and name (case-insensitive) is rejected and the transaction aborts.
5. Activity event recorded. The provider re-checks that the wallet account and network are still the same before updating React state.

## Data Flow — Change Detection (Recheck)
1. User selects a protected recipient → fresh `resolveBns(name)` (bypasses app-level cache).
2. Core recomputes the current fingerprint and retrieves the saved pin.
3. Compares identity (case-insensitive name and mapping type), network, exact destination, then fingerprint.
4. Determines `RecipientStatus` in this order: `RESOLUTION_UNAVAILABLE` → `UNPINNED` → `NETWORK_MISMATCH` → `IDENTITY_MISMATCH` → `DESTINATION_CHANGED` → `MATCHES_PIN`.
5. Updates `lastCheckedAt` only after a successful comparison; records an activity event.
6. On change: the old pin is preserved, old + new destinations are displayed, and explicit reapproval is required before the pin is updated. Reapproval verifies the pin id and old destination and cannot change the name or mapping type.
7. A recheck sequence guard discards results that arrive after navigation to another record or a wallet account/network change.

## Storage Schema
IndexedDB database `certora`, version 1, store `recipientPins`:
- Key: `id` (UUID)
- Indexes: `account`, `network`, `name`
- Fields per `RecipientPin`: id, account, network, name, mappingType, destination, fingerprint, approvedAt, lastCheckedAt
- Partitioned by `account` + `network`; no wallet secrets stored.
- At most one pin per account + network + name (case-insensitive); enforced inside the write transaction.
- The store rejects any pin or lookup whose network is not Testnet.

## Wallet State Ownership
A single `WalletProvider` (`src/state/WalletProvider.tsx`) owns the adapter, provider detection, connection state, and (in development only) the mock provider. Screens consume `useWallet()` from this context. This prevents multiple adapters/mock instances from disagreeing about connection state or exposing a different mock than the one used by the Resolve screen.

The adapter subscribes to `connect`, `disconnect`, `accountsChanged`, `networkChanged`, `lock`, and `unlock`; it uses a separate unbinder list for provider events so a UI subscriber unsubscribing can never detach the provider bindings. A stale `refresh()` cannot overwrite a newer account/network event, and replacing the provider unbinds the previous one.

Mock mode is fixed when the page loads. It is not recomputed on render, so in-app navigation cannot silently swap the wallet backend mid-session; production builds compile it out.

## Safety Policy
- Never silently replace an existing pin.
- A changed destination requires an explicit confirmation dialog; reapproval updates the existing pin in place and cannot change its name or mapping type.
- A failed/uncertain resolution never becomes an approved recipient.
- Mainnet and unknown networks are blocked for resolution, pinning, and rechecks; Testnet is required for all writes. The wallet-reported value is never coerced to Testnet.
- Name, mapping-type, or fingerprint differences are reported as an identity mismatch; they do not offer a one-click replacement.
- Duplicate pins for the same account + network + name are rejected.
- Local pins are approval evidence, not authenticity proofs.
- Mock mode is development-only, fixed at page load, and can never be enabled in a production build.
