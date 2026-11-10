import { describe, it, expect } from 'vitest';
import { generateFingerprint, makeFingerprintInput } from './fingerprint';

describe('generateFingerprint', () => {
  it('produces a 64-character hex SHA-256 string', async () => {
    const fp = await generateFingerprint(
      makeFingerprintInput({
        name: 'merchant.bdx',
        network: 'testnet',
        mappingType: 'wallet',
        destination: 'BDX...recipientA',
      }),
    );
    expect(typeof fp).toBe('string');
    expect(fp.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(fp)).toBe(true);
  });

  it('produces different fingerprints for different destinations', async () => {
    const a = await generateFingerprint(
      makeFingerprintInput({
        name: 'merchant.bdx',
        network: 'testnet',
        mappingType: 'wallet',
        destination: 'recipientA',
      }),
    );
    const b = await generateFingerprint(
      makeFingerprintInput({
        name: 'merchant.bdx',
        network: 'testnet',
        mappingType: 'wallet',
        destination: 'recipientB',
      }),
    );
    expect(a).not.toBe(b);
  });

  it('preserves case (destination not lowercased)', async () => {
    const upper = await generateFingerprint(
      makeFingerprintInput({
        name: 'merchant.bdx',
        network: 'testnet',
        mappingType: 'wallet',
        destination: 'BDXAddressABC',
      }),
    );
    const lower = await generateFingerprint(
      makeFingerprintInput({
        name: 'merchant.bdx',
        network: 'testnet',
        mappingType: 'wallet',
        destination: 'bdxaddressabc',
      }),
    );
    expect(upper).not.toBe(lower);
  });
});
