import { describe, it, expect } from 'vitest';
import type { ResolveBnsResult } from '@bdxi/web3js';
import { isTestnetAddress, resolveBns, validateBnsName, MAX_NAME_LENGTH } from './resolver';

const TESTNET_ADDRESS = `9${'A'.repeat(94)}`;

type TestResolver = {
  getNetwork(): Promise<{ nettype: string }>;
  resolveBns(name: string): Promise<ResolveBnsResult>;
};

function makeResolver(options: {
  networks?: string[];
  failNetwork?: boolean;
  result?: (name: string) => ResolveBnsResult;
} = {}): TestResolver {
  let networkCall = 0;
  return {
    async getNetwork() {
      if (options.failNetwork) throw new Error('locked');
      const networks = options.networks ?? ['testnet'];
      const nettype = networks[Math.min(networkCall, networks.length - 1)];
      networkCall += 1;
      return { nettype };
    },
    async resolveBns(name: string) {
      return (
        options.result?.(name) ?? {
          name,
          address: TESTNET_ADDRESS,
          verified: false,
        }
      );
    },
  };
}

describe('validateBnsName', () => {
  it('accepts a valid BNS name', () => {
    expect(validateBnsName('merchant.bdx')).toEqual({ valid: true });
    expect(validateBnsName('lynx123.bdx')).toEqual({ valid: true });
    expect(validateBnsName('0-lynx.bdx')).toEqual({ valid: true });
  });

  it('rejects empty names', () => {
    expect(validateBnsName('')).toEqual({ valid: false, reason: 'Enter a BNS name.' });
    expect(validateBnsName('   ')).toEqual({ valid: false, reason: 'Enter a BNS name.' });
  });

  it('rejects wrong suffix', () => {
    expect(validateBnsName('merchant.eth')).toMatchObject({
      valid: false,
      reason: expect.stringContaining('.bdx'),
    });
    expect(validateBnsName('merchant')).toMatchObject({ valid: false });
  });

  it('rejects invalid characters', () => {
    expect(validateBnsName('#lynx.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('$_$lynx.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('Lynx-.bdx')).toMatchObject({ valid: false });
  });

  it('rejects uppercase names with an accurate reason', () => {
    expect(validateBnsName('Merchant.BDX')).toEqual({
      valid: false,
      reason: 'Use only lowercase letters, numbers, and hyphens.',
    });
  });

  it('rejects leading/trailing/consecutive hyphens', () => {
    expect(validateBnsName('-lynx.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('lynx-.bdx')).toMatchObject({ valid: false });
    expect(validateBnsName('lynx--x.bdx')).toMatchObject({ valid: false });
  });

  it('rejects empty label before suffix', () => {
    expect(validateBnsName('.bdx')).toMatchObject({ valid: false });
  });

  it('rejects excessively long names', () => {
    const long = 'a'.repeat(MAX_NAME_LENGTH + 1) + '.bdx';
    expect(validateBnsName(long)).toMatchObject({ valid: false });
  });
});

describe('resolveBns safety', () => {
  it('returns a validated Testnet resolution', async () => {
    const result = await resolveBns(makeResolver(), 'merchant.bdx', 'testnet');
    expect(result.name).toBe('merchant.bdx');
    expect(result.destination).toBe(TESTNET_ADDRESS);
    expect(result.network).toBe('testnet');
    expect(result.mappingType).toBe('wallet');
    expect(result.verified).toBe(false);
  });

  it('rejects a non-Testnet network argument', async () => {
    await expect(
      resolveBns(makeResolver(), 'merchant.bdx', 'mainnet' as 'testnet'),
    ).rejects.toThrow(/Testnet/);
  });

  it('rejects a wallet that is on Mainnet', async () => {
    await expect(
      resolveBns(makeResolver({ networks: ['mainnet'] }), 'merchant.bdx', 'testnet'),
    ).rejects.toThrow(/Wallet network is mainnet/);
  });

  it('rejects a wallet that changes network during resolution', async () => {
    await expect(
      resolveBns(
        makeResolver({ networks: ['testnet', 'mainnet'] }),
        'merchant.bdx',
        'testnet',
      ),
    ).rejects.toThrow(/Wallet network is mainnet/);
  });

  it('blocks resolution when the provider network cannot be read', async () => {
    await expect(
      resolveBns(makeResolver({ failNetwork: true }), 'merchant.bdx', 'testnet'),
    ).rejects.toThrow(/Could not confirm the wallet network/);
  });

  it('rejects a resolver result with a different name', async () => {
    await expect(
      resolveBns(
        makeResolver({
          result: () => ({ name: 'someone-else.bdx', address: TESTNET_ADDRESS, verified: false }),
        }),
        'merchant.bdx',
        'testnet',
      ),
    ).rejects.toThrow(/different name/);
  });

  it('rejects a non-Testnet or malformed destination', async () => {
    await expect(
      resolveBns(
        makeResolver({
          result: (name) => ({ name, address: 'bxInvalidAddress', verified: false }),
        }),
        'merchant.bdx',
        'testnet',
      ),
    ).rejects.toThrow(/invalid Testnet destination/);

    await expect(
      resolveBns(
        makeResolver({
          result: (name) => ({ name, address: 'BDXRecipientA', verified: false }),
        }),
        'merchant.bdx',
        'testnet',
      ),
    ).rejects.toThrow(/invalid Testnet destination/);
  });

  it('never upgrades a wallet-provided verified flag', async () => {
    const result = await resolveBns(
      makeResolver({
        result: (name) => ({
          name,
          address: TESTNET_ADDRESS,
          verified: true as false,
        }),
      }),
      'merchant.bdx',
      'testnet',
    );
    expect(result.verified).toBe(false);
  });
});

describe('isTestnetAddress', () => {
  it('accepts a testnet-shaped address and rejects Mainnet', () => {
    expect(isTestnetAddress(TESTNET_ADDRESS)).toBe(true);
    expect(isTestnetAddress(`bx${'A'.repeat(93)}`)).toBe(false);
    expect(isTestnetAddress('BDXRecipientA')).toBe(false);
  });
});
