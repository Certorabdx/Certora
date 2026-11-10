import { useCallback, useState } from 'react';
import type { ResolveBnsResult } from '@bdxi/web3js';
import { resolveBns, validateBnsName, type BnsNameValidation } from '@certora/beldex-adapter';
import type { BnsResolution } from '@certora/core';

type ResolverLike = {
  resolveBns(name: string): Promise<ResolveBnsResult>;
};

export function useResolver(web3: ResolverLike | null) {
  const [resolution, setResolution] = useState<BnsResolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<BnsNameValidation | null>(null);

  const resolve = useCallback(
    async (name: string, network: 'testnet') => {
      if (!web3) {
        setError('Wallet not connected.');
        return null;
      }
      if (network !== 'testnet') {
        setError('Certora requires Beldex Testnet.');
        return null;
      }

      const v = validateBnsName(name);
      setValidation(v);
      if (!v.valid) {
        setError(v.reason || 'Invalid BNS name.');
        return null;
      }

      setLoading(true);
      setError(null);
      setResolution(null);

      try {
        const result = await resolveBns(web3, name, network);
        setResolution(result);
        setValidation(null);
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Resolution failed.';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [web3],
  );

  const clear = useCallback(() => {
    setResolution(null);
    setError(null);
    setValidation(null);
  }, []);

  return {
    resolution,
    loading,
    error,
    validation,
    resolve,
    clear,
  };
}
