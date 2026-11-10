import {
  detectProvider,
  toBdxError,
  BdxRpcError,
  type BeldexProvider,
} from '@bdxi/web3js';
import type { AdapterError } from './types';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Detect the Beldex Wallet extension provider.
 * Returns null when no wallet is installed or announcing.
 */
export async function discoverProvider(opts?: { timeoutMs?: number }): Promise<BeldexProvider | null> {
  try {
    return await detectProvider({ timeoutMs: opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS });
  } catch (err) {
    // detectProvider should not throw under normal circumstances, but normalize
    // any unexpected transport error into a BdxRpcError for consistency.
    throw toBdxError(err);
  }
}

/**
 * Normalize any provider/SDK error into a structured adapter error.
 */
export function normalizeError(err: unknown): AdapterError {
  const bdxErr = toBdxError(err);

  if (BdxRpcError.isUserRejection(bdxErr)) {
    return { code: 'USER_REJECTED', message: 'You declined the request in the wallet.', retryable: true };
  }
  if (BdxRpcError.isLocked(bdxErr)) {
    return { code: 'WALLET_LOCKED', message: 'The Beldex Wallet is locked. Please unlock it and try again.', retryable: true };
  }
  if (BdxRpcError.isUnauthorized(bdxErr)) {
    return { code: 'UNAUTHORIZED', message: 'Not connected to the Beldex Wallet. Please connect first.', retryable: false };
  }
  if (BdxRpcError.isExpired(bdxErr)) {
    return { code: 'REQUEST_EXPIRED', message: 'The request expired. Please try again.', retryable: true };
  }

  return {
    code: bdxErr.code.toString(),
    message: bdxErr.message || 'An unexpected Beldex Wallet error occurred.',
    retryable: true,
  };
}

export type { BeldexProvider };
