import { describe, it, expect, vi } from 'vitest';
import type { BeldexProvider } from '@bdxi/web3js';
import { BeldexWalletAdapter, normalizeWalletNetwork, type WalletConnection } from './index';

const ADDRESS_A = `9${'A'.repeat(94)}`;
const ADDRESS_B = `9${'B'.repeat(94)}`;

class FakeProvider implements BeldexProvider {
  readonly isBeldex = true;
  address: string | null = ADDRESS_A;
  network: 'mainnet' | 'testnet' = 'testnet';
  addressDeferred: Promise<string> | null = null;

  private listeners = new Map<string, Set<(data: unknown) => void>>();

  async request(args: { method: string; params?: object; signal?: AbortSignal }): Promise<unknown> {
    switch (args.method) {
      case 'bdx_connect':
        if (!this.address) throw new Error('No address');
        return { address: this.address, network: this.network };
      case 'bdx_getAddress':
        if (this.addressDeferred) return this.addressDeferred;
        if (!this.address) throw new Error('No grant');
        return { address: this.address };
      case 'bdx_getNetwork':
        return { nettype: this.network, height: 1, protocolVersion: 1 };
      case 'bdx_disconnect':
        return undefined;
      default:
        throw new Error(`Unexpected method ${args.method}`);
    }
  }

  on(event: string, listener: (data: unknown) => void): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event: string, listener: (data: unknown) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, data: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(data);
  }
}

describe('normalizeWalletNetwork', () => {
  it('never coerces unknown values into Testnet', () => {
    expect(normalizeWalletNetwork('testnet')).toBe('testnet');
    expect(normalizeWalletNetwork('mainnet')).toBe('mainnet');
    expect(normalizeWalletNetwork('regtest')).toBe('unknown');
    expect(normalizeWalletNetwork(undefined)).toBe('unknown');
    expect(normalizeWalletNetwork(null)).toBe('unknown');
  });
});

describe('BeldexWalletAdapter events', () => {
  it('connects and exposes an immutable Testnet connection', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);

    const connection = await adapter.connect();
    expect(connection).toEqual({
      address: ADDRESS_A,
      network: 'testnet',
      connected: true,
    });
    expect(adapter.connectionState).toEqual(connection);
    expect(adapter.isTestnet()).toBe(true);
  });

  it('propagates account changes with a new object', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    const before = adapter.connectionState!;
    const seen: Array<WalletConnection | null> = [];
    adapter.onConnectionChange(() => seen.push(adapter.connectionState));

    provider.emit('accountsChanged', { address: ADDRESS_B });

    expect(adapter.connectionState).not.toBe(before);
    expect(adapter.connectionState!.address).toBe(ADDRESS_B);
    expect(before.address).toBe(ADDRESS_A);
    expect(seen[seen.length - 1]).toBe(adapter.connectionState);
  });

  it('clears the connection on a wallet switch', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    provider.emit('accountsChanged', { address: null });
    expect(adapter.connectionState).toBeNull();
  });

  it('normalizes and surfaces Mainnet/unknown network changes', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    provider.emit('networkChanged', { nettype: 'mainnet' });
    expect(adapter.connectionState!.network).toBe('mainnet');
    expect(adapter.isTestnet()).toBe(false);

    provider.emit('networkChanged', { nettype: 'something-else' });
    expect(adapter.connectionState!.network).toBe('unknown');
    expect(adapter.isTestnet()).toBe(false);
  });

  it('clears on lock and restores the grant on unlock', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    provider.emit('lock', undefined);
    expect(adapter.connectionState).toBeNull();

    provider.emit('unlock', undefined);
    await vi.waitFor(() => {
      expect(adapter.connectionState?.address).toBe(ADDRESS_A);
    });
  });

  it('does not let a stale refresh overwrite a newer account event', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    let resolveAddress!: (value: string) => void;
    provider.addressDeferred = new Promise<string>((resolve) => {
      resolveAddress = resolve;
    });

    const refreshPromise = adapter.refresh();
    provider.emit('accountsChanged', { address: ADDRESS_B });
    resolveAddress(ADDRESS_A);

    await refreshPromise;
    expect(adapter.connectionState!.address).toBe(ADDRESS_B);
  });

  it('keeps provider bindings when a UI subscriber unsubscribes', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    const handler = vi.fn();
    const unsubscribe = adapter.onConnectionChange(handler);
    unsubscribe();

    provider.emit('accountsChanged', { address: ADDRESS_B });
    expect(handler).not.toHaveBeenCalled();
    expect(adapter.connectionState!.address).toBe(ADDRESS_B);
  });

  it('unbinds the previous provider when replaced', async () => {
    const first = new FakeProvider();
    const second = new FakeProvider();
    const adapter = new BeldexWalletAdapter();

    adapter.setProvider(first);
    await adapter.connect();
    adapter.setProvider(second);

    first.emit('accountsChanged', { address: ADDRESS_B });
    expect(adapter.connectionState).toBeNull();

    second.emit('networkChanged', { nettype: 'mainnet' });
    expect(adapter.connectionState).toBeNull();
  });

  it('clearProvider removes bindings and state', async () => {
    const provider = new FakeProvider();
    const adapter = new BeldexWalletAdapter();
    adapter.setProvider(provider);
    await adapter.connect();

    adapter.clearProvider();
    expect(adapter.connectionState).toBeNull();
    expect(adapter.hasProvider).toBe(false);

    provider.emit('accountsChanged', { address: ADDRESS_B });
    expect(adapter.connectionState).toBeNull();
  });
});
