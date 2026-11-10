# Certora Testnet Runbook

This runbook describes how to perform the **real** Beldex Testnet validation of Certora: connect a live wallet, resolve a real BNS name, pin address A, change the mapping to address B outside Certora, detect the change, and explicitly reapprove B.

> **Current status: partially executed on 2026-11-10.** A real Beldex Wallet extension was connected on Testnet, and a read-only dry run passed: 8/8 validation cases, 7/7 fresh negative lookups, zero pins, and a real disconnect/reconnect. The full flow has **not** been executed: no Testnet funds were obtained, no BNS name was registered, no mapping update or transaction hash exists. Do not fill the evidence table with mock values.

## 0. Blockers observed on 2026-11-10

- `https://faucet.beldex.dev` is gated by Cloudflare Turnstile. The automated browser received no token after 36 s; the CAPTCHA must be solved manually by a human.
- The faucet pays **205 tBDX per address/IP/24 h**.
- A one-year BNS registration at HF18+ costs **650 tBDX** (`Beldex-Coin/beldex` `src/beldex_economy.h`: 500 BDX basic + 30%). Testnet shortens the registration duration, not the price. One faucet request cannot fund a registration.
- The public Testnet currently reports **`bns_counts: 0`** and treats every name as available. There is no existing name to test with.

### 0.1 Read-only dry-run preflight (no funds required)

These checks were completed on real Testnet and can be repeated before funding:

1. Connect the extension on **Testnet** and open Certora without `?mock=1`.
2. Enter invalid names (`merchant`, `Merchant.BDX`, `bad name.bdx`, `mer.bdx`, `mer--chant.bdx`, `.bdx`, over-length). Expect an inline reason and a disabled **Resolve** button, with no wallet prompt.
3. Resolve several unregistered names (`merchant.bdx`, `bob.bdx`, `toretto.bdx`, `my-shop.bdx`, `a.bdx`). Expect `BNS resolution failed: name not registered`; no resolution receipt and no **Approve & pin** control.
4. Resolve the same name twice. Confirm two distinct `bdx_resolveBns` wallet calls — not a cached result.
5. Open **Protected Recipients** and confirm it is empty / IndexedDB `recipientPins` count is 0.
6. In **Settings**, disconnect; confirm the app returns to the connect-required state; reconnect and approve in the wallet.

Expected: every failure is safe, no pin is written, and no signature or payment prompt appears.

## 1. Prerequisites

- [ ] Node.js 20+ and npm installed.
- [ ] Beldex Wallet browser extension installed from the official vendor source and unlocked (validated with version 1.0.4).
- [ ] Wallet network set to **Beldex Testnet** (not Mainnet). Certora rejects Mainnet.
- [ ] A Testnet wallet funded with at least **650 tBDX plus transaction fees** for the one-year BNS registration. The public faucet alone (205 tBDX/24 h, CAPTCHA-gated) is insufficient.
- [ ] An **owner-controlled** BNS name on Testnet (for example, a name you registered specifically for this test). Confirm `bns_counts` is non-zero or register the name with `bns_buy_mapping`.
- [ ] Two distinct Testnet destination addresses:
  - **Recipient A** — initial mapping.
  - **Recipient B** — changed mapping.
  - Use two different wallet accounts/addresses that you control. Do not use Mainnet addresses.
- [ ] Ability to update the BNS mapping through the official BNS marketplace or the wallet's BNS management UI.
- [ ] A screen recorder or screenshots enabled if you want visual evidence (optional but recommended).

Recommended safety:

- Use only Testnet funds.
- Never paste a seed phrase or private key into Certora; Certora never asks for them.
- Verify every full address character-by-character before approving.
- Do not use a valuable BNS name or Mainnet wallet for this test.

## 2. Start Certora

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (normally `http://localhost:5173`) in a Chromium-based browser with the Beldex Wallet extension installed.

Do **not** append `?mock=1`. Mock mode is test-only and cannot be used as validation evidence.

Optional preflight:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Record the commit/build identifier if the workspace is under version control. This repository currently has no Git history; record the date and file inventory instead.

## 3. Validation procedure

### Step 1 — Connect the live wallet

1. Confirm the extension is on **Testnet** and unlocked.
2. Open Certora. The header should show **Connect wallet** when a provider is detected.
3. Click **Connect wallet** and approve the connection in the Beldex Wallet.
4. Confirm the header shows the connected account and **Beldex Testnet**.
5. If the wallet is on Mainnet, confirm Certora displays a Mainnet rejection and does not switch networks.

**Expected:** A real account address is displayed; no fabricated address appears. If no extension is present, Certora reports that no provider was detected.

Record:

- Date/time:
- Certora URL:
- Wallet extension version:
- Connected account:
- Network reported by wallet:
- Screenshot/evidence reference:

### Step 2 — Confirm the initial mapping outside Certora

Use the official BNS marketplace/wallet UI to confirm that the test name currently resolves to **Recipient A**.

Record:

- BNS name:
- Expected initial destination (Recipient A):
- How the mapping was confirmed:
- Screenshot/evidence reference:

### Step 3 — Resolve and pin Recipient A

1. Go to **Resolve BNS**.
2. Enter the BNS name (must end in `.bdx`).
3. Click **Resolve**.
4. Confirm the displayed destination equals **Recipient A**. Certora shows the full destination and discloses `Verified: No` / resolver trust limitations.
5. Click **Approve & pin recipient**.
6. Review the confirmation dialog; confirm the name and full destination.
7. Click **Approve & pin**.
8. Confirm the success toast and that the recipient appears under **Protected Recipients**.

**Expected:** The pin is stored locally in IndexedDB, partitioned by the connected account and Testnet network. No transaction is sent by Certora.

Record:

- Resolved address:
- Resolution duration shown:
- Pin confirmation time:
- Screenshot/evidence reference:

### Step 4 — Verify persistence

1. Reload the page.
2. Reconnect the wallet if required.
3. Open **Protected Recipients** and the recipient details.
4. Confirm the pin, destination, fingerprint, and approval time are still present.

**Expected:** The pin persists across reloads for the same account + network. It does not appear for a different account or network.

Record:

- Reload time:
- Pin still present (yes/no):
- Fingerprint shown:
- Screenshot/evidence reference:

### Step 5 — Change the mapping to Recipient B (outside Certora)

Perform this step through the official BNS marketplace or wallet UI, **not** through Certora. Certora has no write path for BNS mappings.

1. Update the test name's mapping from Recipient A to **Recipient B**.
2. Confirm the update transaction succeeded in the wallet/explorer.
3. Record the real transaction hash and explorer link. Never invent a hash.

Record:

- Update method (marketplace / wallet UI):
- New destination (Recipient B):
- Transaction hash:
- Explorer URL:
- Confirmation time:
- Screenshot/evidence reference:

### Step 6 — Detect the change in Certora

1. Return to Certora (same account, Testnet).
2. Open **Protected Recipients** → the test recipient.
3. Confirm the stored pin still shows **Recipient A**.
4. Click **Recheck destination**.
5. Certora performs a fresh resolution; it must not reuse the earlier result.
6. Confirm the status **Destination changed since approval**.
7. Confirm both addresses are shown:
   - Previously approved: Recipient A.
   - Resolved now: Recipient B.
8. Confirm the original pin has **not** changed automatically.

**Expected:** `DESTINATION_CHANGED`; old pin preserved; both addresses visible.

Record:

- Recheck time:
- Status shown:
- Old pin destination:
- Fresh resolution destination:
- Pin unchanged (yes/no):
- Screenshot/evidence reference:

### Step 7 — Reapprove Recipient B

1. Click **Review & approve new destination**.
2. Review the dialog showing old and new destinations.
3. Click **Approve new destination**.
4. Confirm the success toast **Destination approved**.
5. Confirm the recipient now stores Recipient B (same pin record id) and the activity log records `Destination approved`.

**Expected:** The pin is updated only after explicit confirmation; no automatic replacement occurred.

Record:

- Reapproval time:
- New stored destination:
- Pin record id (if visible):
- Activity entries:
- Screenshot/evidence reference:

### Step 8 — Confirm a matching recheck

1. Click **Recheck destination** again.
2. Confirm the fresh resolution returns Recipient B.
3. Confirm the status **Matches your approved recipient**.

**Expected:** `MATCHES_PIN`; no change prompt; pin remains Recipient B.

Record:

- Final recheck time:
- Final status:
- Final destination:
- Screenshot/evidence reference:

### Step 9 — Negative checks (recommended)

- [ ] Reject the wallet connection request → Certora shows a user-rejection error and remains disconnected.
- [ ] Lock the wallet, then attempt connect → Certora shows a locked-wallet error.
- [ ] Switch the wallet to Mainnet → Certora reports Mainnet as rejected and does not resolve/pin.
- [ ] Stop the wallet/resolver or use an invalid name → Certora reports failure and preserves the pin.
- [ ] Disconnect the wallet → pins disappear from the current view; reconnecting the same account restores them.
- [ ] Switch wallet accounts → only the new account's pins are shown.
- [ ] Remove a recipient → confirm the confirmation dialog and local deletion.
- [ ] Clear local data → confirm pins are removed; activity is session-local.

## 4. Evidence package

Collect the following in a secure location:

1. Date, environment, OS, browser, extension version, Certora build/commit.
2. Connected Testnet account address (public).
3. BNS name and both destination addresses (public).
4. Real mapping-update transaction hash and explorer URL.
5. Screenshots or recording of:
   - connected wallet on Testnet;
   - initial resolution to Recipient A;
   - pin confirmation;
   - persistence after reload;
   - mapping update receipt;
   - `DESTINATION_CHANGED` with both addresses;
   - reapproval confirmation;
   - final `MATCHES_PIN`.
6. Any errors encountered and how they were resolved.

Update `docs/testnet-validation.md` with the real evidence. Until then, its status remains **NOT PERFORMED**.

## 5. Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| "Wallet not detected" | Extension missing, disabled, or different browser profile | Install/unlock the official extension, reload, confirm provider detection |
| Connect button absent | Provider not detected within 3 s | Unlock the extension, reload the page, check the extension is allowed on this origin |
| "You declined the request" | Connection/approval rejected in wallet | Retry and approve in the wallet |
| "Wallet is locked" | Extension locked | Unlock the wallet and retry |
| Mainnet rejection | Wallet on Mainnet | Switch the wallet to Testnet manually; Certora will not switch it |
| Resolution unavailable | Invalid name, resolver error, or network mismatch | Confirm the name on Testnet, check the wallet, retry; the pin should remain unchanged |
| Pin missing after reload | Different account/network, cleared storage, or private window | Reconnect the same account on Testnet; check IndexedDB/browser storage settings |

## 6. Rollback / cleanup

- Removing a recipient deletes only the local pin for the current account/network.
- **Clear all local data** in Settings removes all pins for the connected account/network.
- Disconnecting the wallet does not delete pins.
- Certora never sends transactions, so there is nothing to reverse on-chain from Certora. Any mapping change made during validation must be reverted separately through the official BNS tooling if desired.
- Use Testnet-only funds throughout.
