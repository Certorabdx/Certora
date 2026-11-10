/**
 * MOCK WALLET — TEST / E2E ONLY.
 *
 * This is a fake Beldex Wallet provider used exclusively by Playwright E2E
 * tests when the application is loaded with the `?mock=1` query parameter.
 * It is NEVER used in production and clearly labeled as mocked. It does not
 * establish live testnet operation and does not contact the Beldex network.
 *
 * It implements the same surface as @bdxi/web3js (BeldexProvider /
 * BeldexWeb3) so the rest of the application can be exercised end-to-end
 * without a real wallet extension installed.
 */
import type { BeldexProvider, ConnectResult, Nettype, ResolveBnsResult } from '@bdxi/web3js';

export interface MockWalletConfig {
  network?: Nettype;
  address?: string;
  connectReject?: boolean;
  resolveResult?: { name: string; address: string };
  resolveReject?: boolean;
}

class MockProvider implements BeldexProvider {
  readonly isBeldex = true;
  private listeners = new Map<string, Array<(data: unknown) => void>>();

  constructor(private config: MockWalletConfig = {}) {}

  request(args: { method: string; params?: object; signal?: AbortSignal }): Promise<unknown> {
    const { method } = args;
    if (method === 'bdx_connect') {
      if (this.config.connectReject) {
        return Promise.reject({ code: 4001, message: 'User rejected' });
      }
      return Promise.resolve<ConnectResult>({
        address: this.config.address ?? 'BDXMockAddress123',
        network: this.config.network ?? 'testnet',
      });
    }
    if (method === 'bdx_getNetwork') {
      return Promise.resolve({
        nettype: this.config.network ?? 'testnet',
        height: 1000,
        protocolVersion: 1,
      });
    }
    if (method === 'bdx_resolveBns') {
      if (this.config.resolveReject) {
        return Promise.reject({ code: -32603, message: 'Resolver failure' });
      }
      const r = this.config.resolveResult ?? {
        name: 'merchant.bdx',
        address: 'BDXRecipientA',
      };
      return Promise.resolve<ResolveBnsResult>({ name: r.name, address: r.address, verified: false });
    }
    if (method === 'bdx_getAddress') {
      return Promise.resolve({ address: this.config.address ?? 'BDXMockAddress123' });
    }
    if (method === 'bdx_disconnect') {
      return Promise.resolve(undefined);
    }
    if (method === 'bdx_getState') {
      return Promise.resolve({ state: 'unlocked' });
    }
    return Promise.reject({ code: -32601, message: 'Method not found' });
  }

  on(event: string, listener: (data: unknown) => void): void {
    const existing = this.listeners.get(event);
    if (existing) {
      existing.push(listener);
    } else {
      this.listeners.set(event, [listener]);
    }
  }

  off(event: string, listener: (data: unknown) => void): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  emit(event: string, data: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(data);
  }
}

class MockWeb3 {
  provider: MockProvider;
  private config: MockWalletConfig;
  private _connected = false;
  private _address: string | null = null;
  private _network: Nettype | null = null;

  constructor(config: MockWalletConfig = {}) {
    this.config = config;
    this.provider = new MockProvider(config);
    this._network = config.network ?? 'testnet';
    this._address = config.address ?? 'BDXMockAddress123';
  }

  get isConnected(): boolean {
    return this._connected;
  }
  get address(): string | null {
    return this._address;
  }
  get network(): Nettype | null {
    return this._network;
  }

  async connect(): Promise<ConnectResult> {
    const res = await this.provider.request({ method: 'bdx_connect' });
    this._connected = true;
    this._address = (res as ConnectResult).address;
    this._network = (res as ConnectResult).network as Nettype;
    this.provider.emit('connect', res);
    return res as ConnectResult;
  }

  async disconnect(): Promise<void> {
    await this.provider.request({ method: 'bdx_disconnect' });
    this._connected = false;
    this._address = null;
    this.provider.emit('disconnect', undefined);
  }

  async getAddress(): Promise<string> {
    return this._address!;
  }

  async getNetwork() {
    return this.provider.request({ method: 'bdx_getNetwork' });
  }

  async resolveBns(name: string): Promise<ResolveBnsResult> {
    return (await this.provider.request({
      method: 'bdx_resolveBns',
      params: { name },
    })) as ResolveBnsResult;
  }

  /** Test-only: change the resolution result mid-test. */
  setResolveResult(name: string, address: string): void {
    this.config.resolveResult = { name, address };
  }

  setRejecting(reject: boolean): void {
    this.config.resolveReject = reject;
  }

  on(event: string, listener: (data: unknown) => void): void {
    this.provider.on(event, listener);
  }
  off(event: string, listener: (data: unknown) => void): void {
    this.provider.off(event, listener);
  }
}

export type { MockWeb3 };

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  // Mock mode is a development/E2E-only facility. It must never be possible to
  // activate it on a deployed production build.
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(window.location.search).has('mock');
}

export function createMockWallet(config: MockWalletConfig = {}): MockWeb3 {
  const web3 = new MockWeb3(config);
  // Expose on window so E2E tests can reconfigure the mock mid-test.
  if (typeof window !== 'undefined') {
    (window as unknown as { __mockWallet?: MockWeb3 }).__mockWallet = web3;
  }
  return web3;
}
