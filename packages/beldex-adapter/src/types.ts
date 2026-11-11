import type { WalletNetwork } from '@certora/core';

export interface WalletConnection {
  address: string;
  network: WalletNetwork;
  connected: boolean;
}

export interface AdapterError {
  code: string;
  message: string;
  retryable: boolean;
}
