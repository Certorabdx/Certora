# Certora Technical Research — Beldex SDK Integration

## SDK Confirmed
- Package: `@bdxi/web3js`
- Version: **1.0.2** (installed and inspected locally)
- Repository: https://github.com/Beldex-Coin/bdx-web3js
- Entry: ESM (`./dist/index.js`), types (`./dist/index.d.ts`)
- Peer dependency: `react >= 18` (optional, for the `/react` subpath)

## Verified Provider & Wallet API

### Provider discovery
```ts
declare function detectProvider(opts?: { timeoutMs?: number }): Promise<BeldexProvider | null>
```
- Resolves with the Beldex Wallet provider, or `null` if none announced within `timeoutMs` (default 3000 ms).
- Render "Install Beldex Wallet" CTA when null.

### BeldexProvider interface
```ts
interface BeldexProvider {
  request(args: { method: BdxMethod; params?: object; signal?: AbortSignal }): Promise<unknown>
  on(event: BdxEvent, listener: (data: unknown) => void): void
  off(event: BdxEvent, listener: (data: unknown) => void): void
  readonly isBeldex: true
}
type BdxEvent = 'connect' | 'disconnect' | 'accountsChanged' | 'networkChanged' | 'balanceChanged' | 'lock' | 'unlock'
```

### BeldexWeb3 class (recommended wrapper)
```ts
declare class BeldexWeb3 {
  constructor(provider: BeldexProvider, opts?: { readTimeoutMs?: number; approvalTimeoutMs?: number })
  readonly provider: BeldexProvider
  readonly address: string | null          // cached from last connect()
  readonly network: Nettype | null          // cached from last connect()/networkChanged
  readonly isConnected: boolean
  connect(): Promise<ConnectResult>         // { address, network }
  disconnect(): Promise<void>
  getAddress(): Promise<string>
  getBalance(): Promise<Balance>
  getNetwork(): Promise<GetNetworkResult>   // { nettype, height, protocolVersion, walletVersion? }
  getState(): Promise<WalletState>          // 'locked' | 'unlocked' | 'no-wallet'
  resolveBns(name: string): Promise<ResolveBnsResult>
  sendTransaction(params): Promise<SendTransactionResult>
  signMessage(message): Promise<SignMessageResult>
  verifyMessage(params): Promise<boolean>
  on(event, listener): this
  off(event, listener): this
  once(event, listener): this
  static isUserRejection(e): boolean
  static isLocked(e): boolean
  static isUnauthorized(e): boolean
}
type Nettype = 'mainnet' | 'testnet'
type ResolveBnsResult = { name: string; address: string; verified: false }
type ConnectResult = { address: string; network: Nettype }
```

### Errors
```ts
declare function toBdxError(e: unknown): BdxRpcError
class BdxRpcError extends Error {
  readonly code: number
  static isUserRejection(e): boolean   // 4001
  static isLocked(e): boolean          // 4900
  static isUnauthorized(e): boolean    // 4100
  static isExpired(e): boolean         // 4999
  static isUnknownOutcome(e): boolean  // 4998
}
ERROR_CODES = { USER_REJECTED: 4001, UNAUTHORIZED: 4100, WALLET_LOCKED: 4900,
  NO_WALLET: 4901, REQUEST_EXPIRED: 4999, UNKNOWN_OUTCOME: 4998,
  METHOD_NOT_FOUND: -32601, INVALID_PARAMS: -32602, INTERNAL: -32603 }
```

## BNS Resolution — Verified Response Shape
```ts
interface ResolveBnsResult {
  name: string;     // e.g. "merchant.bdx"
  address: string;  // resolved Beldex wallet address
  verified: false;  // ALWAYS false in v1
}
```
- `resolveBns(name)` accepts a BNS name such as `merchant.bdx`.
- `verified` is always `false` in v1. Resolution trusts the **wallet's configured HTTPS resolver**, not an on-chain proof.
- No `mappingType`, `network`, `resolvedAt`, or `durationMs` fields are returned by the SDK — these are added by Certora's application layer.

## Address / Network Helpers
```ts
declare function checkAddress(address: string, expectedNetwork?: Nettype): AddressCheck
declare function isValidAddressShape(address: string, expectedNetwork?: Nettype): boolean
type AddressCheck = { valid: boolean; kind?: 'standard' | 'integrated'; network?: Nettype; reason?: string }
```
- Use `checkAddress(address, 'testnet')` to confirm a resolved destination is a testnet-shaped address before displaying/pinning.

## Unit Conversion
```ts
declare const ATOMIC_PER_BDX = 1000000000n
declare const BDX_DECIMALS = 9
declare function toAtomic(value): bigint
declare function fromAtomic(value): string
declare function parseAtomic(value): string
```
Not needed for the MVP (Certora does not send payments), but available.

## Provider Events
Subscribable via `web3.on(event, listener)`:
- `connect` → `{ address, network }`
- `disconnect`
- `accountsChanged` → `{ address: string | null }` (null after wallet switch)
- `networkChanged` → `{ nettype: string }`
- `balanceChanged`, `lock`, `unlock`

Certora uses `connect`, `disconnect`, `accountsChanged`, and `networkChanged` to re-verify testnet status and reset session state.

## Trust Limitations (Documented per Rule 5)
1. **`verified` is always `false`** — BNS resolution is not independently verified on-chain. The wallet's configured HTTPS resolver is the trust anchor.
2. Certora must **never** label results as cryptographically verified, trustless, blockchain-proof, or guaranteed safe.
3. Accurate descriptions: "Resolved through Beldex Wallet", "Matches previously approved destination", "Destination changed since approval", "Independent on-chain verification unavailable".
4. Recipient pinning is evidence of previous user approval, **not** proof of identity or authenticity.

## BNS Owner-Side Methods (Manual Testnet Demonstration Only)
These are performed by the owner using the official Beldex Wallet / marketplace, **not** exposed through Certora's public interface:
- `bns_buy_mapping` — register a BNS name → destination
- `bns_update_mapping` — change a BNS name's destination
- `bns_hash_name` — hash a BNS name
- `bns_known_names` — query known names

Certora never calls these. The mapping change in Experiment C is performed outside Certora via the owner-controlled testnet wallet.

## Network Requirements
- Certora operates **exclusively on Beldex Testnet** (`Nettype === 'testnet'`).
- Detect actual wallet network via `web3.network` and `bdx_getNetwork`.
- Reject Mainnet; never silently switch networks; never fall back to a Mainnet endpoint.
- Recheck network following account or network changes (subscribe to `accountsChanged` and `networkChanged`).
- Disable recipient approval when the network cannot be confirmed.
- Persistent Testnet indicator shown in the UI.

## What Certora Does NOT Do
- No payment signing or submission (Beldex Wallet owns that).
- No wallet secrets requested, stored, or transmitted.
- No RPC credentials exposed.
- No Mainnet support.
- No fake resolution results.
