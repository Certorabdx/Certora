/**
 * Wallet state is owned by a single shared provider (see
 * `src/state/WalletProvider.tsx`). Screens must consume the context instead of
 * creating their own adapter so every part of the UI sees the same connection
 * and the same mock instance in E2E mode.
 */
export { useWallet } from '../state/WalletProvider';
