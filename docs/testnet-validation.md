# Certora Testnet Validation

**Date of this report:** 2026-11-10

**Verdict: FULL BNS CHANGE-DETECTION VALIDATION NOT PERFORMED. A partial live Testnet validation (connection, read-only dry run, negative lookups) was performed and is documented in §3.**

No BNS registration, initial mapping, mapping update, transaction hash, explorer link, funded balance, or pin/change/reapproval cycle was obtained. The partial evidence below proves that Certora can connect to the real Beldex Wallet extension on Testnet, that the read-only validation and failure path works across repeated fresh lookups, and that failed lookups do not create pins. It is **not** evidence that the full protection flow works on Testnet.

## 1. What was validated

| Area | Method | Result |
|------|--------|--------|
| Core fingerprinting | Vitest unit tests | 3/3 pass |
| Comparison/status engine | Vitest unit tests | 9/9 pass |
| IndexedDB recipient store | Vitest + fake-indexeddb | 7/7 pass |
| BNS input validation | Vitest unit tests | 8/8 pass |
| TypeScript | `tsc --noEmit` | Pass |
| ESLint | `eslint src packages tests` | Pass, 0 warnings |
| Production build | `vite build` | Pass |
| UI workflow with a mocked provider | Playwright E2E | 3/3 pass |
| Browser console (mocked run) | Manual inspection | Only React Router v7 future-flag warnings; no runtime errors |
| Live Beldex Testnet connection | Official extension, real Testnet account | **Partial — see §3** |
| Read-only Testnet dry run | Official extension, no funds | **Pass — 8 validation cases + 7 fresh negative lookups (see §3.1)** |
| Full live BNS change-detection flow | Real name + mapping update | **Not performed** |

Total automated tests: **27 unit tests + 3 mocked E2E tests**, all passing at the time of this report.

## 2. E2E scenarios that passed (mocked wallet only)

These tests use the development-only fake provider enabled by `?mock=1`. They prove UI wiring and state transitions. **They do not prove that the Beldex SDK, a real wallet, or the BNS resolver work on Testnet.**

1. **Connect → resolve → pin → list**
   - Mock provider reports Testnet and `BDXMockAddress123`.
   - Resolves `merchant.bdx` → `BDXRecipientA`.
   - Explicit pin confirmation writes the pin.
   - Protected Recipients lists the pinned name.
2. **Destination change detection and reapproval**
   - Pins `bob.bdx` → `BDXRecipientA`.
   - Mock resolution changes to `BDXRecipientB`.
   - Recheck performs a fresh resolution and shows `DESTINATION_CHANGED`.
   - Old pin remains `BDXRecipientA`; both addresses are displayed.
   - Explicit reapproval updates the pin in place.
   - A subsequent recheck returns `MATCHES_PIN`.
3. **Testnet indicator**
   - A Testnet indicator is visible in the shell.

Evidence for these tests is reproducible with `npx playwright test --reporter=line`. It is **mock evidence**, not Testnet evidence.

## 3. Partial real Testnet evidence (2026-11-10)

**Environment**

- Windows, Playwright 1.49.1 Chromium, headed.
- Official **Beldex Wallet** browser extension **1.0.4**, downloaded as the Chrome Web Store CRX and loaded unpacked into an isolated temporary browser profile.
- Certora dev build at `http://localhost:5173`, no `?mock=1`.
- Isolated temporary Testnet account (public address only; seed and password were not recorded in the project):
  `9utBPU6ot84SbArKiRBkF8f2dpxpqbwqyFhKoK9MmKQVP7zePQHqMwKCfyCMbAWBanc2jywkpUPQ6NUg9Gxk7xd67MbMQai`

**What was actually observed**

| Check | Result |
|-------|--------|
| Real wallet provider detected | **Yes** — `window.beldex` present |
| Connection approved in the official extension | **Yes** — approval card showed `http://localhost:5173` and the Testnet address |
| Certora header after connect | Showed `9U` / truncated Testnet address and **Beldex Testnet** |
| Real BNS lookup through the wallet | **Yes** — `merchant.bdx` returned `BNS resolution failed: name not registered` |
| Pin created from the failed lookup | **No** — failure surfaced and no pin was written |
| Mock mode used | **No** |
| Faucet wallet connection | **Yes** — `https://faucet.beldex.dev` connected to the same Testnet address |
| Faucet request submitted | **No** — Cloudflare Turnstile remained `Loading CAPTCHA...` and issued no token after 36 s |
| Balance after the attempt | **0 tBDX** |
| BNS name owned/registered | **No** |
| Mapping update / transaction hash / explorer link | **None** |

The real failed resolution is consistent with the Testnet explorer and daemon: at height **4,342,034**, `bns_counts` was **0** and the Testnet BNS lookup API returned every queried name as available. There was no registered Testnet BNS name to resolve.

### 3.1 Read-only dry run (2026-11-10)

With no faucet funds available, a second real Testnet session exercised only read-only behavior. The wallet remained connected to Testnet; no transaction or signature was requested.

| Check | Result |
|-------|--------|
| Invalid-input matrix | **8/8 pass** — empty, missing suffix, uppercase, space, Cyrillic homoglyph, consecutive hyphens, empty label, over-maximum length |
| Resolve button on invalid input | Disabled for all 8 cases |
| Wallet RPCs during invalid input | **0** — validation is client-side |
| Real BNS lookups | **7/7 completed** through `bdx_resolveBns` |
| Fresh-call evidence | **7 distinct request IDs** for 7 clicks; no cached result reused |
| Repeated name | `merchant.bdx` resolved twice via two separate RPCs (1,492 ms then 716 ms) |
| Lookup results | All 7 returned `name not registered` (`merchant.bdx`, `bob.bdx`, `toretto.bdx`, `my-shop.bdx`, `a.bdx`, plus trimmed input) |
| Failure UI | Every lookup showed `Resolution failed` / `BNS resolution failed: name not registered` |
| Resolution receipt / pin control | Never shown for a failed lookup |
| Pins after the run | **0** — IndexedDB `recipientPins` count was 0 and the recipients page stayed empty |
| Wallet approval or signing prompt | **None** during lookups |
| Disconnect / reconnect | **Pass** — disconnect returned the app to the connect-required state; reapproval restored the Testnet session |
| Browser console / page errors | **0 / 0** |

The daemon was re-read during this run at height **4,342,130**: `nettype: "testnet"`, `mainnet: false`, **`bns_counts: 0`**.

This dry run proves real Testnet wallet traffic, validation behavior, fresh-call behavior, failure handling, and the no-pin-on-failure guarantee. It does **not** prove a positive resolution, pin creation, change detection, or reapproval.

A validation bug was found and fixed during this run: uppercase input such as `Merchant.BDX` previously produced the misleading message “BNS names must end with .bdx”. The suffix check is now case-insensitive, and uppercase input is rejected with “Use only lowercase letters, numbers, and hyphens.” A regression test was added; the suite is now **27/27**.

## 4. Why full validation was not performed

1. **Faucet CAPTCHA.** `faucet.beldex.dev` is gated by Cloudflare Turnstile. In the automated headed browser the widget stayed on `Loading CAPTCHA...` and produced no token, so the faucet request could not be submitted. The CAPTCHA was **not** bypassed.
2. **Faucet amount vs. BNS price.** The faucet pays **205 tBDX per address/IP every 24 h**. In the official `Beldex-Coin/beldex` source, `src/beldex_economy.h` sets the HF18+ BNS fee to 500 BDX basic plus 30% for one year = **650 tBDX** (plus network fee), independent of network; Testnet only shortens the registration duration, not the price. One faucet request therefore cannot fund a one-year Testnet BNS registration.
3. **No Testnet BNS supply.** The public Testnet currently has **zero BNS records**, so there is no existing owner-controlled name to test with and no name to update.
4. **No mapping-update authority.** Without a registered name, there is no on-chain mapping to change from Recipient A to Recipient B, and therefore no transaction hash or explorer link to record.

## 5. Real Testnet evidence status

| Required evidence | Status |
|-------------------|--------|
| Live wallet connection on Beldex Testnet | **Obtained** (real extension, real Testnet address) |
| Real Testnet account | **Obtained** (public address above) |
| Real BNS lookup | **Obtained — negative only** (`merchant.bdx`, `bob.bdx`, `toretto.bdx`, `my-shop.bdx`, `a.bdx`: all not registered) |
| Real Testnet fresh-call behavior | **Obtained** — 7 clicks produced 7 distinct `bdx_resolveBns` RPCs |
| Real Testnet validation matrix | **Obtained** — 8/8 cases, 0 wallet requests |
| No pin written after failed lookups | **Obtained** — IndexedDB count 0 |
| Real disconnect and reconnect | **Obtained** |
| Real BNS name registered/owned on Testnet | **Not obtained** |
| Initial mapping confirmed to Recipient A | **Not obtained** |
| Certora resolved a real name to an address | **Not obtained** |
| Pin persisted across a real reload | **Not obtained** |
| Real mapping update from A to B | **Not obtained** |
| Mapping-update transaction hash | **Not obtained** |
| Explorer link for the update | **Not obtained** |
| Certora detected a real `DESTINATION_CHANGED` | **Not obtained** |
| Old pin preserved during the real change | **Not obtained** |
| Explicit reapproval to B | **Not obtained** |
| Final real `MATCHES_PIN` | **Not obtained** |
| Screenshot of the real connection + negative lookup | **Obtained** (temporary evidence files outside the repo) |

## 6. What is required next

To complete the real validation:

- Manually complete the Turnstile challenge at `https://faucet.beldex.dev`, **or** fund the temporary Testnet address with at least **650 tBDX plus transaction fees** from another Testnet source.
- Register a one-year Testnet BNS name (for example with the wallet RPC `bns_buy_mapping`), or provide an owner-controlled Testnet name.
- Confirm the name resolves to **Recipient A**; pin it in Certora.
- Update the mapping to **Recipient B** with `bns_update_mapping` outside Certora; record the real transaction hash and explorer link.
- Recheck in Certora, confirm `DESTINATION_CHANGED`, preserve the old pin, explicitly reapprove B, and confirm a final `MATCHES_PIN`.

Only after those steps produce real evidence may this document state that Certora's full protection flow has been validated on Beldex Testnet.

## 7. Known limitations affecting validation

- The SDK returns `verified: false`; Certora cannot independently verify a BNS mapping on-chain.
- The wallet's configured resolver is trusted for name→address data.
- No background monitoring exists; change detection requires a manual recheck.
- Pins are local approval evidence, not identity or authenticity proofs.
- Mock mode is compiled out of production builds and must never be used as evidence.
- There is no hosted deployment or published build; validation must use the local dev/`preview` build described in the runbook. The source is published at `https://github.com/Certorabdx/Certora`.
- Testnet BNS supply and faucet conditions are external and can change; the observations above are dated 2026-11-10.
