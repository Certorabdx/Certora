# Certora Threat Model

**Scope:** Certora Testnet MVP — BNS resolution, explicit recipient pinning, fresh rechecks, destination-change detection, and explicit reapproval.

**Status:** Design-level review. This is not a formal security audit. Partial real Testnet evidence exists (connection, validation, negative lookups); the full BNS change-detection cycle has not been validated.

## 1. Assets

| Asset | Why it matters |
|-------|----------------|
| Approved destination pin | The address the user believes they approved; a silent change enables misdirected payments |
| User approval intent | The pin is only legitimate if the user explicitly approved this exact destination |
| Resolution result | A wrong or stale result can cause a wrong approval or a false sense of safety |
| Connected wallet address | Partitions pins by account; wrong partitioning leaks or mixes protection state |
| Network identity | Testnet/Mainnet confusion could lead to real-fund loss |
| Local activity log | Evidence of what happened in the session; must not be fabricated |
| Wallet provider channel | The only source of addresses and BNS resolution |

Certora does **not** hold private keys, seed phrases, signing capability, or funds.

## 2. Actors and trust boundaries

| Actor / boundary | Trust |
|------------------|-------|
| User | Trusted to make approval decisions, but can be deceived |
| Beldex Wallet extension | Trusted to enforce its own permissions and return the selected account/network; not independently verified by Certora |
| Wallet's configured BNS resolver (HTTPS) | Trusted for name→address data; Certora cannot prove the mapping on-chain (`verified: false`) |
| BNS name owner | Untrusted; may change the mapping at any time |
| Web origin serving Certora | Trusted code delivery; compromise/XSS defeats client-side protections |
| IndexedDB | Local, user-profile-readable storage; not a secure enclave |
| Clipboard | Untrusted output channel; clipboard malware can replace copied addresses |
| Mock wallet provider | Test-only; never a source of production truth |

## 3. Threats and mitigations

### T1. Malicious or compromised BNS resolution

**Threat:** The wallet's resolver returns an attacker-controlled address, or a network attacker alters the response.

**Mitigations:**
- Resolution is performed only through the official `@bdxi/web3js` provider/wallet path.
- The UI states that resolution is not independently verified and that `verified` is always `false` in SDK v1.
- The full destination is displayed before approval; the user must explicitly approve it.
- The pin comparison is exact and case-preserving.

**Residual risk:** A compromised resolver or wallet can return a wrong address that the user approves. Certora cannot detect this without independent on-chain verification, which the SDK does not provide. The resolved address is passed through the SDK's `checkAddress(..., 'testnet')`, but that check is currently informational: a failed shape check does not block display or pinning.

### T2. Silent destination change after approval

**Threat:** A BNS owner changes the mapping; the user sends to the old or new address without noticing.

**Mitigations:**
- Pins store the exact approved destination and a SHA-256 fingerprint.
- Recheck always performs a fresh `resolveBns` call; no cached resolution is reused.
- A changed destination produces `DESTINATION_CHANGED` and shows old vs. current addresses.
- The original pin is never replaced automatically; a separate dialog is required.
- A failed resolution produces `RESOLUTION_UNAVAILABLE` and preserves the pin.

**Residual risk:** Certora only detects changes when the user runs a recheck. There is no background monitoring or push notification. A user who never rechecks receives no warning.

### T3. Automatic, accidental, or coerced pin replacement

**Threat:** Code or UI flow updates a pin without a clear, fresh approval.

**Mitigations:**
- `savePin` is only called after explicit user actions (initial approval or reapproval dialog confirmation).
- Reapproval uses the same pin id and only after confirmation; it does not remove/re-add as a side effect.
- The comparison engine never calls storage write functions.
- Policy functions in `packages/core/src/policies.ts` encode “no automatic replacement”.

**Residual risk:** A user can be socially engineered into clicking approve. The dialog shows both addresses, but users may not read them.

### T4. Mainnet / network confusion

**Threat:** The user connects to Mainnet and believes they are on Testnet, or the app silently switches networks.

**Mitigations:**
- Certora requires `network === 'testnet'` for resolve/pin/recheck flows.
- Mainnet connections are surfaced as rejected; the app does not switch networks itself.
- Persistent Testnet indicators appear in the sidebar, header (when connected), and mobile header.
- Pins are partitioned by network, preventing cross-network reuse.

**Residual risk:** The wallet extension controls the network. Certora relies on the reported `network` value.

### T5. Account mix-up / cross-account data exposure

**Threat:** Pins from one wallet account appear under another account.

**Mitigations:**
- IndexedDB records and queries are partitioned by `account` + `network`.
- Account changes clear the in-memory recipient list and reload for the new account.
- Connected account is displayed in the header.

**Residual risk:** A wallet that reports an incorrect account address undermines partitioning.

### T6. Stale or uncertain resolution treated as success

**Threat:** A timeout or RPC error is interpreted as “no change” or “matches”.

**Mitigations:**
- Resolver failures are caught and surfaced as errors.
- `resolve()` returns `null` on failure; the details screen maps this to `RESOLUTION_UNAVAILABLE`.
- The pin is preserved and no comparison status is claimed.
- `lastCheckedAt` is only updated after a successful comparison.

**Residual risk:** None specific beyond resolver correctness.

### T7. XSS / compromised frontend

**Threat:** Injected script reads or rewrites pins, changes displayed addresses, or triggers approvals.

**Mitigations:**
- React escaping for rendered data; no `dangerouslySetInnerHTML`.
- No remote scripts, analytics, or third-party iframes.
- Pins are local only; no secrets to exfiltrate.
- Explicit confirmation dialogs for state-changing actions.

**Residual risk:** XSS in the app origin or a compromised dependency can fully control the UI. Client-side pinning cannot defend against this. Dependency versions are pinned, but no SCA/audit was performed.

### T8. Local storage tampering

**Threat:** Malware or another local process edits IndexedDB pins to make a malicious address appear approved.

**Mitigations:**
- Fingerprint integrity check detects accidental or naive record modification when compared with the destination.
- Pins are approval evidence only, not an authenticity proof.
- The UI discloses this limitation.

**Residual risk:** A local attacker can rewrite both destination and fingerprint or modify the app at runtime. Certora cannot protect a compromised browser profile.

### T9. Clipboard / address-poisoning attacks

**Threat:** Malware replaces a copied address, or a lookalike address is pasted during a mapping update outside Certora.

**Mitigations:**
- Certora displays addresses and provides copy buttons but does not initiate payments.
- The UI advises reviewing the full address.

**Residual risk:** Certora cannot validate addresses entered into external wallet/BNS tools. Address-poisoning defenses are out of scope.

### T10. Mock mode mistaken for live operation

**Threat:** A demo or reviewer treats `?mock=1` results as real Testnet evidence.

**Mitigations:**
- Mock mode requires `import.meta.env.DEV` and is compiled out of production builds.
- Mock wallet is labeled test/E2E-only in source and exposed only for Playwright.
- Documentation and the validation report distinguish mock evidence from the partial real Testnet evidence (connection, validation matrix, fresh negative lookups).
- The app never writes fabricated tx hashes or verification claims.

**Residual risk:** A developer can still run a dev build with mock data and misinterpret it; documentation and labeling are the controls.

### T11. Supply-chain / dependency compromise

**Threat:** A malicious or buggy dependency changes wallet behavior or UI.

**Mitigations:**
- Exact versions pinned in `package.json` for runtime dependencies.
- Small dependency surface; no analytics or remote UI libraries.
- SDK types and runtime behavior inspected locally.

**Residual risk:** No formal dependency audit, lockfile review, or reproducible-build verification was performed.

## 4. Security properties intentionally not claimed

Certora does **not** claim:

- on-chain verification of BNS mappings;
- authenticity or identity of a BNS name owner;
- protection after a user approves a malicious destination;
- background monitoring of mapping changes;
- security against a compromised browser, extension, operating system, or app origin;
- transaction simulation, payment signing, or fund recovery;
- audited smart-contract or wallet security.

## 5. Data handling

- Pins: `id`, `account`, `network`, `name`, `mappingType`, `destination`, `fingerprint`, `approvedAt`, `lastCheckedAt`.
- Storage: IndexedDB database `certora`, store `recipientPins`, in the browser profile.
- Activity: in-memory only for the session (not persisted).
- No wallet secrets, seed phrases, private keys, or payment data are requested or stored.
- Clearing local data removes pins for the connected account/network; activity is session state.

## 6. Open items before any production use

1. Complete the full live Testnet change-detection validation in `docs/testnet-runbook.md` and record the evidence. Partial read-only evidence already exists in `docs/testnet-validation.md`.
2. Obtain an independent security review of the adapter, storage, and UI trust disclosures.
3. Add dependency scanning and lockfile review.
4. Decide whether background/polling rechecks are in scope and document their privacy/performance implications.
5. Reassess the SDK's verification model if a future version provides cryptographic proofs.
