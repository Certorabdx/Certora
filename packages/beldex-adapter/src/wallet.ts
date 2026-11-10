import {
  BeldexWeb3,
  type BeldexProvider,
  type ConnectResult,
  type Nettype,
  BdxRpcError,
  type GetNetworkResult,
} from '@bdxi/web3js';
import type { WalletConnection } from './types';

const REQUIRED_NETWORK: Nettype = 'testnet';

/**
 * Wrapper around BeldexWeb3 that manages connection state, testnet verification,
 * and subscription to wallet events (connect, disconnect, accountsChanged,
 * networkChanged).
 */
export class BeldexWalletAdapter {
  private web3: BeldexWeb3 | null = null;
  private provider: BeldexProvider | null = null;
  private listeners: Array<() => void> = [];
  private connection: WalletConnection | null = null;

  constructor() {}

  /** Whether a provider has been detected (wallet installed). */
  get hasProvider(): boolean {
    return this.provider !== null;
  }

  /** Whether the wallet is currently connected. */
  get isConnected(): boolean {
    return this.web3?.isConnected ?? false;
  }

  /** Current connection, or null. */
  get connectionState(): WalletConnection | null {
    return this.connection;
  }

  /** Set a provider and wrap it in BeldexWeb3. */
  setProvider(provider: BeldexProvider): void {
    this.provider = provider;
    this.web3 = new BeldexWeb3(provider);
    this.bindEvents();
  }

  /** Clear provider and connection. */
  clearProvider(): void {
    this.unbindEvents();
    this.web3 = null;
    this.provider = null;
    this.connection = null;
  }

  private bindEvents(): void {
    if (!this.web3) return;
    const web3 = this.web3;

    const onConnect = (data: unknown) => {
      const ev = data as { address?: string; network?: string };
      if (ev.address) {
        this.connection = {
          address: ev.address,
          network: (ev.network ?? web3.network) as string,
          connected: true,
        };
      }
      this.notify();
    };

    const onDisconnect = () => {
      this.connection = null;
      this.notify();
    };

    const onAccountsChanged = (data: unknown) => {
      const ev = data as { address?: string | null };
      if (ev.address === null) {
        // Wallet switched — requires a fresh connect().
        this.connection = null;
      } else if (ev.address && this.connection) {
        this.connection.address = ev.address;
      }
      this.notify();
    };

    const onNetworkChanged = (data: unknown) => {
      const ev = data as { nettype?: string };
      if (this.connection && ev.nettype) {
        this.connection.network = ev.nettype;
      }
      this.notify();
    };

    web3.on('connect', onConnect);
    web3.on('disconnect', onDisconnect);
    web3.on('accountsChanged', onAccountsChanged);
    web3.on('networkChanged', onNetworkChanged);

    this.listeners.push(
      () => {
        web3.off('connect', onConnect);
        web3.off('disconnect', onDisconnect);
        web3.off('accountsChanged', onAccountsChanged);
        web3.off('networkChanged', onNetworkChanged);
      },
    );
  }

  private unbindEvents(): void {
    this.listeners.forEach((unbind) => unbind());
    this.listeners = [];
  }

  private notify(): void {
    // No-op; consumers poll connectionState or subscribe via onConnectionChange.
  }

  /** Subscribe to connection-state changes. Returns an unsubscribe function. */
  onConnectionChange(handler: () => void): () => void {
    this.listeners.push(handler);
    return () => {
      const idx = this.listeners.indexOf(handler);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Connect to the wallet. Opens the wallet approval UI.
   * Throws a normalized error on rejection/lock/unauthorized.
   */
  async connect(): Promise<WalletConnection> {
    if (!this.web3) {
      throw new Error('No Beldex Wallet provider detected. Install the Beldex Wallet extension.');
    }

    try {
      const result: ConnectResult = await this.web3.connect();
      this.connection = {
        address: result.address,
        network: result.network,
        connected: true,
      };
      this.notify();
      return { ...this.connection };
    } catch (err) {
      throw this.normalize(err);
    }
  }

  /** Disconnect and revoke the origin's grant. */
  async disconnect(): Promise<void> {
    if (!this.web3) return;
    try {
      await this.web3.disconnect();
    } catch {
      // Ignore disconnect errors — clear local state regardless.
    }
    this.connection = null;
    this.notify();
  }

  /** Refresh connection state from the wallet (address + network). */
  async refresh(): Promise<WalletConnection | null> {
    if (!this.web3) {
      return this.connection;
    }

    try {
      const [address, network] = await Promise.all([
        this.web3.getAddress(),
        this.web3.getNetwork(),
      ]);
      this.connection = {
        address,
        network: network.nettype,
        connected: true,
      };
      this.notify();
      return { ...this.connection };
    } catch {
      // No grant or read failed — connection stays null.
      return this.connection;
    }
  }

  /** Confirm the connected network is Beldex Testnet. */
  isTestnet(network?: string): boolean {
    return (network ?? this.connection?.network ?? this.web3?.network) === REQUIRED_NETWORK;
  }

  /** Get the current network, or null if unknown. */
  getNetwork(): Nettype | null {
    return this.web3?.network ?? null;
  }

  /** Expose the underlying BeldexWeb3 instance for resolver use. */
  getWeb3(): BeldexWeb3 | null {
    return this.web3;
  }

  /** Get the current wallet state (locked / unlocked / no-wallet). */
  async getState(): Promise<'locked' | 'unlocked' | 'no-wallet'> {
    if (!this.web3) throw new Error('No wallet provider detected.');
    return this.web3.getState();
  }

  /** Get the full network descriptor from the wallet. */
  async getNetworkInfo(): Promise<GetNetworkResult> {
    if (!this.web3) throw new Error('No wallet provider detected.');
    return this.web3.getNetwork();
  }

  private normalize(err: unknown): Error {
    if (BdxRpcError.isUserRejection(err)) {
      return new Error('You declined the request in the wallet.');
    }
    if (BdxRpcError.isLocked(err)) {
      return new Error('The Beldex Wallet is locked. Please unlock it and try again.');
    }
    if (BdxRpcError.isUnauthorized(err)) {
      return new Error('Not connected to the Beldex Wallet. Please connect first.');
    }
    if (BdxRpcError.isExpired(err)) {
      return new Error('The request expired. Please try again.');
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}

export { REQUIRED_NETWORK };
export type { ConnectResult };
