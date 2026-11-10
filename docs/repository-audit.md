# Repository Audit — Certora

## Status
Greenfield project. The `C:\Users\HP\Documents\Certora` directory contained no existing files, source, dependencies, or configuration at the start of this work.

## Environment
- OS: Windows (PowerShell)
- Node: v24.20.0
- npm: 11.19.0

## Existing work to preserve
None. No existing source, UI components, tests, scripts, or git history was found.

## Decisions made as a result
- A new client-side React + TypeScript + Vite application will be created in this directory.
- Package manager: npm.
- Official Beldex SDK: `@bdxi/web3js` (verified v1.0.2 installed and type-declarations inspected).
- Build tool: Vite.
- Styling: Tailwind CSS with a custom Certora design system (no heavy component library).
- Testing: Vitest (unit) + Playwright (E2E with a mock provider).
- Local storage: IndexedDB (raw `idb`-style wrapper, no extra heavy dependency where avoidable).

## Current repository state
- Git repository initialized on branch `main`; remote: `https://github.com/Certorabdx/Certora`.
- Initial history was published in three commits (application, tests, documentation), followed by a documentation polish commit.
- `.gitignore` excludes `node_modules/`, `dist/`, Playwright output, environment files, private keys, certificates, and logs.
- No wallet secrets, credentials, build output, or test artifacts are committed.
- No deployment, hosted build, or real fund movement occurred.

## References consulted
- @bdxi/web3js v1.0.2 package (installed locally; `dist/index.d.ts` and `dist/units-BUm1-jX-.d.ts` read in full)
- Beldex Web3JS SDK GitHub: https://github.com/Beldex-Coin/bdx-web3js
- npm package: https://www.npmjs.com/package/@bdxi/web3js
- Beldex Testnet: https://testnet.beldex.dev/
- BNS Marketplace: https://bns.beldex.io/marketplace/
- Faucet: https://faucet.beldex.dev/
- Wallet extension: https://github.com/Beldex-Coin/beldex-wallet-extension
- Hacken wallet security assessment: https://hacken.io/audits/beldex/pt-beldex-wallet-bdx-aug2026/
