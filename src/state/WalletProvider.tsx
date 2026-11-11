import * as React from 'react';
import { detectProvider } from '@bdxi/web3js';
import { BeldexWalletAdapter, type WalletConnection } from '@certora/beldex-adapter';
import { isSupportedNetwork } from '@certora/core';
import { isMockMode, createMockWallet, type MockWeb3 } from '../mockWallet';

type Web3 = ReturnType<BeldexWalletAdapter['getWeb3']> | MockWeb3 | null;

interface WalletContextValue {
  connection: WalletConnection | null;
  providerAvailable: boolean;
  detecting: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<WalletConnection>;
  disconnect: () => Promise<void>;
  isTestnet: boolean;
  getWeb3: () => Web3;
  mock: boolean;
  clearError: () => void;
}

const WalletContext = React.createContext<WalletContextValue | null>(null);

/**
 * Mock mode is fixed for the lifetime of the page. Recomputing it on every
 * render would let an in-app navigation (which drops the query string) swap
 * the wallet backend from the mock to real-provider detection mid-session.
 * Production builds compile this constant to `false`.
 */
const MOCK_MODE = import.meta.env.DEV && isMockMode();

/**
 * Single source of truth for wallet state.
 *
 * The adapter owns one provider subscription and pushes immutable connection
 * snapshots to this provider. Every wallet account/network/lock event updates
 * React state immediately; screens never need to poll.
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = React.useState<WalletConnection | null>(null);
  const [providerAvailable, setProviderAvailable] = React.useState(false);
  const [detecting, setDetecting] = React.useState(true);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const adapterRef = React.useRef<BeldexWalletAdapter | null>(null);
  const mockWeb3Ref = React.useRef<MockWeb3 | null>(null);

  // Mock mode is a development/E2E facility only. It is compiled out of
  // production builds by `import.meta.env.DEV` and can never be enabled on a
  // deployed build; mock results are never live testnet evidence.
  const mock = MOCK_MODE;

  React.useEffect(() => {
    const adapter = new BeldexWalletAdapter();
    adapterRef.current = adapter;

    let cancelled = false;

    const unsubscribe = adapter.onConnectionChange(() => {
      if (!cancelled) setConnection(adapter.connectionState);
    });

    (async () => {
      try {
        if (mock) {
          const web3 = createMockWallet();
          mockWeb3Ref.current = web3;
          adapter.setProvider(web3.provider);
          setProviderAvailable(true);
          const refreshed = await adapter.refresh();
          if (cancelled) return;
          setDetecting(false);
          if (refreshed) setConnection(refreshed);
          return;
        }

        const provider = await detectProvider({ timeoutMs: 3000 });
        if (cancelled) return;
        setProviderAvailable(provider !== null);
        setDetecting(false);
        if (provider) {
          adapter.setProvider(provider);
          try {
            const refreshed = await adapter.refresh();
            if (refreshed && !cancelled) setConnection(refreshed);
          } catch {
            // No existing grant — connection remains null.
          }
        }
      } catch (err) {
        if (cancelled) return;
        setDetecting(false);
        setError(err instanceof Error ? err.message : 'Failed to detect wallet provider.');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      adapter.clearProvider();
      if (adapterRef.current === adapter) adapterRef.current = null;
      if (mockWeb3Ref.current) mockWeb3Ref.current = null;
    };
  }, [mock]);

  const connect = React.useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) throw new Error('Wallet adapter not initialized.');
    setError(null);
    setConnecting(true);
    try {
      const result = await adapter.connect();
      setConnection(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed.';
      setError(msg);
      throw err;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = React.useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    setError(null);
    await adapter.disconnect();
    setConnection(null);
  }, []);

  const getWeb3 = React.useCallback((): Web3 => {
    if (mock) return mockWeb3Ref.current;
    return adapterRef.current?.getWeb3() ?? null;
  }, [mock]);

  const isTestnet = connection ? isSupportedNetwork(connection.network) : false;

  const value: WalletContextValue = {
    connection,
    providerAvailable,
    detecting,
    connecting,
    error,
    connect,
    disconnect,
    isTestnet,
    getWeb3,
    mock,
    clearError: () => setError(null),
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
