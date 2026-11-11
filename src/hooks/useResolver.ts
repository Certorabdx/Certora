import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResolveBnsResult } from '@bdxi/web3js';
import { resolveBns, validateBnsName, type BnsNameValidation } from '@certora/beldex-adapter';
import { requireTestnet, type BnsResolution, type Nettype } from '@certora/core';

type ResolverLike = {
  resolveBns(name: string): Promise<ResolveBnsResult>;
  getNetwork(): Promise<{ nettype: string }>;
};

/**
 * Resolve BNS names through the wallet.
 *
 * Guarantees:
 *   - only Testnet resolutions are accepted;
 *   - a request that becomes stale (newer request, input change, wallet
 *     change, or unmount) can never write its result into state;
 *   - invalid input clears any previous resolution instead of leaving a stale
 *     result available to pin.
 */
export function useResolver(web3: ResolverLike | null) {
  const [resolution, setResolution] = useState<BnsResolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<BnsNameValidation | null>(null);
  const requestRef = useRef(0);

  const reset = useCallback(() => {
    requestRef.current += 1;
    setResolution(null);
    setLoading(false);
    setError(null);
    setValidation(null);
  }, []);

  // A different wallet/provider instance invalidates every in-flight request
  // and every previously displayed resolution.
  useEffect(() => {
    reset();
  }, [web3, reset]);

  useEffect(() => {
    return () => {
      requestRef.current += 1;
    };
  }, []);

  const resolve = useCallback(
    async (name: string, network: Nettype) => {
      const requestId = ++requestRef.current;

      if (!web3) {
        setResolution(null);
        setLoading(false);
        setValidation(null);
        setError('Wallet not connected.');
        return null;
      }

      if (!requireTestnet(network)) {
        setResolution(null);
        setLoading(false);
        setValidation(null);
        setError('Certora requires Beldex Testnet.');
        return null;
      }

      const v = validateBnsName(name);
      setValidation(v);
      if (!v.valid) {
        setResolution(null);
        setLoading(false);
        setError(v.reason || 'Invalid BNS name.');
        return null;
      }

      setLoading(true);
      setError(null);
      setResolution(null);

      try {
        const result = await resolveBns(web3, name, network);
        if (requestId !== requestRef.current) {
          return null;
        }
        setResolution(result);
        setValidation(null);
        return result;
      } catch (err) {
        if (requestId !== requestRef.current) {
          return null;
        }
        const msg = err instanceof Error ? err.message : 'Resolution failed.';
        setResolution(null);
        setError(msg);
        return null;
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      }
    },
    [web3],
  );

  return {
    resolution,
    loading,
    error,
    validation,
    resolve,
    clear: reset,
  };
}
