import {
  BeldexWeb3,
  type BeldexProvider,
  type ConnectResult,
  BdxRpcError,
  type GetNetworkResult,
} from '@bdxi/web3js';
import { isSupportedNetwork, type WalletNetwork } from '@certora/core';
import type { WalletConnection } from './types';

const REQUIRED_NETWORK = 'testnet' as const;

/**
 * Normalize any wallet-reported network into the explicit values Certora
 * understands. Anything unrecognized becomes `unknown` — never `testnet`.
 */
export function normalizeWalletNetwork(value: unknown): WalletNetwork {
  if (value === 'testnet') return 'testnet';
  if (value === 'mainnet') return 'mainnet';
  return 'unknown';
}

/**
 * Wrapper around BeldexWeb3 that manages connection state, testnet
 * verification, and subscription to wallet events (connect, disconnect,
 * accountsChanged, networkChanged, lock, unlock).
 *
 * Every state transition replaces the connection object and notifies
 * subscribers, so React state updates never depend on polling and never
 * receive a mutated object with the same reference.
 */
export class BeldexWalletAdapter {
  private web3: BeldexWeb3 | null = null;
  private provider: BeldexProvider | null = null;
  private providerUnbinders: Array<() => void> = [];
  private stateListeners = new Set<() => void>();
  private connection: WalletConnection | null = null;
  private stateVersion = 0;

  constructor() {}

  /** Whether a provider has been detected (wallet installed). */
  get hasProvider(): boolean {
    return this.provider !== null;
  }

  /** Whether the wallet is currently connected. */
  get isConnected(): boolean {
    return this.web3?.isConnected ?? false;
  }

  /** Current connection snapshot, or null. */
  get connectionState(): WalletConnection | null {
    return this.connection;
  }

  /** Set a provider and wrap it in BeldexWeb3. */
  setProvider(provider: BeldexProvider): void {
    this.unbindEvents();
    this.provider = provider;
    this.web3 = new BeldexWeb3(provider);
    this.connection = null;
    this.stateVersion += 1;
    this.bindEvents();
    this.emit();
  }

  /** Clear provider and connection. */
  clearProvider(): void {
    this.unbindEvents();
    this.web3 = null;
    this.provider = null;
    this.setConnection(null);
  }

  private setConnection(next: WalletConnection | null): void {
    this.connection = next;
    this.stateVersion += 1;
    this.emit();
  }

  private emit(): void {
    for (const listener of Array.from(this.stateListeners)) {
      try {
        listener();
      } catch {
        // A failing subscriber must not prevent other subscribers from
        // receiving the new state.
      }
    }
  }

  private bindEvents(): void {
    if (!this.web3) return;
    const web3 = this.web3;

    const onConnect = (data: unknown) => {
      const ev = data as { address?: unknown; network?: unknown };
      if (typeof ev.address !== 'string' || !ev.address) {
        return;
      }
      this.setConnection({
        address: ev.address,
        network: normalizeWalletNetwork(ev.network ?? web3.network),
        connected: true,
      });
    };

    const onDisconnect = () => {
      this.setConnection(null);
    };

    const onAccountsChanged = (data: unknown) => {
      const ev = data as { address?: unknown };
      if (ev.address === null) {
        // Wallet switched — requires a fresh connect().
        this.setConnection(null);
        return;
      }
      if (typeof ev.address !== 'string' || !ev.address) {
        return;
      }
      const network = this.connection?.network ?? normalizeWalletNetwork(web3.network);
      this.setConnection({
        address: ev.address,
        network,
        connected: true,
      });
    };

    const onNetworkChanged = (data: unknown) => {
      const ev = data as { nettype?: unknown };
      if (!this.connection) return;
      this.setConnection({
        ...this.connection,
        network: normalizeWalletNetwork(ev.nettype),
      });
    };

    const onLock = () => {
      // A locked wallet cannot resolve or recheck. Drop the connection state;
      // the unlock handler re-reads the grant.
      this.setConnection(null);
    };

    const onUnlock = () => {
      void this.refresh();
    };

    web3.on('connect', onConnect);
    web3.on('disconnect', onDisconnect);
    web3.on('accountsChanged', onAccountsChanged);
    web3.on('networkChanged', onNetworkChanged);
    web3.on('lock', onLock);
    web3.on('unlock', onUnlock);

    this.providerUnbinders.push(() => {
      web3.off('connect', onConnect);
      web3.off('disconnect', onDisconnect);
      web3.off('accountsChanged', onAccountsChanged);
      web3.off('networkChanged', onNetworkChanged);
      web3.off('lock', onLock);
      web3.off('unlock', onUnlock);
    });
  }

  private unbindEvents(): void {
    this.providerUnbinders.forEach((unbind) => unbind());
    this.providerUnbinders = [];
  }

  /** Subscribe to connection-state changes. Returns an unsubscribe function. */
  onConnectionChange(handler: () => void): () => void {
    this.stateListeners.add(handler);
    return () => {
      this.stateListeners.delete(handler);
    };
  }

  /**
   * Connect to the wallet. Opens the wallet approval UI.
   * Throws a normalized error on rejection/lock/unauthorized.
   */
  async connect(): Promise<WalletConnection> {
    const web3 = this.web3;
    if (!web3) {
      throw new Error('No Beldex Wallet provider detected. Install the Beldex Wallet extension.');
    }

    try {
      const result: ConnectResult = await web3.connect();
      if (this.web3 !== web3) {
        throw new Error('The wallet provider changed while connecting. Please try again.');
      }
      this.setConnection({
        address: result.address,
        network: normalizeWalletNetwork(result.network),
        connected: true,
      });
      return { ...this.connection! };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('The wallet provider changed')) {
        throw err;
      }
      throw this.normalize(err);
    }
  }

  /** Disconnect and revoke the origin's grant. */
  async disconnect(): Promise<void> {
    const web3 = this.web3;
    if (!web3) {
      this.setConnection(null);
      return;
    }
    try {
      await web3.disconnect();
    } catch {
      // Ignore disconnect errors — clear local state regardless.
    }
    if (this.web3 === web3) {
      this.setConnection(null);
    }
  }

  /** Refresh connection state from the wallet (address + network). */
  async refresh(): Promise<WalletConnection | null> {
    const web3 = this.web3;
    if (!web3) {
      return this.connection;
    }

    const versionAtStart = this.stateVersion;

    try {
      const [address, network] = await Promise.all([web3.getAddress(), web3.getNetwork()]);

      // An account/network event or another operation landed while this read
      // was in flight. Never overwrite the newer state with stale data.
      if (this.web3 !== web3 || versionAtStart !== this.stateVersion) {
        return this.connection;
      }

      if (!address) {
        this.setConnection(null);
        return null;
      }

      this.setConnection({
        address,
        network: normalizeWalletNetwork(network.nettype),
        connected: true,
      });
      return { ...this.connection! };
    } catch {
      // No grant or read failed — leave the existing state untouched.
      return this.connection;
    }
  }

  /** Confirm the connected network is Beldex Testnet. */
  isTestnet(network?: string): boolean {
    if (network !== undefined) {
      return isSupportedNetwork(network);
    }
    return isSupportedNetwork(this.connection?.network ?? this.web3?.network);
  }

  /** Get the current network, or null if unknown. */
  getNetwork(): WalletNetwork | null {
    if (this.connection) {
      return this.connection.network;
    }
    return this.web3?.network ? normalizeWalletNetwork(this.web3.network) : null;
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
