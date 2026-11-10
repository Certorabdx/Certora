export interface WalletConnection {
  address: string;
  network: string;
  connected: boolean;
}

export interface AdapterError {
  code: string;
  message: string;
  retryable: boolean;
}

