import { describe, it, expect } from 'vitest';
import {
  evaluateStatus,
  compareResolutionToPin,
  generateFingerprint,
  makeFingerprintInput,
  type BnsResolution,
  type RecipientPin,
} from './index';

function resolution(dest: string): BnsResolution {
  return {
    name: 'merchant.bdx',
    destination: dest,
    network: 'testnet',
    mappingType: 'wallet',
    verified: false,
    resolvedAt: Date.now(),
    durationMs: 50,
  };
}

async function matchingPin(dest: string): Promise<RecipientPin> {
  const fp = await generateFingerprint(
    makeFingerprintInput({
      name: 'merchant.bdx',
      network: 'testnet',
      mappingType: 'wallet',
      destination: dest,
    }),
  );
  return {
    id: 'pin-1',
    account: 'acct-1',
    network: 'testnet',
    name: 'merchant.bdx',
    mappingType: 'wallet',
    destination: dest,
    fingerprint: fp,
    approvedAt: 1000,
    lastCheckedAt: 1000,
  };
}

describe('evaluateStatus', () => {
  const pin: RecipientPin = {
    id: 'pin-1',
    account: 'acct-1',
    network: 'testnet',
    name: 'merchant.bdx',
    mappingType: 'wallet',
    destination: 'recipientA',
    fingerprint: 'fp-a',
    approvedAt: 1000,
    lastCheckedAt: 1000,
  };

  it('returns UNPINNED when there is no pin', () => {
    expect(evaluateStatus(resolution('recipientA'), null)).toBe('UNPINNED');
  });

  it('returns MATCHES_PIN when destination matches', () => {
    expect(evaluateStatus(resolution('recipientA'), pin)).toBe('MATCHES_PIN');
  });

  it('returns DESTINATION_CHANGED when destination differs', () => {
    expect(evaluateStatus(resolution('recipientB'), pin)).toBe('DESTINATION_CHANGED');
  });

  it('returns NETWORK_MISMATCH when networks differ', () => {
    const mismatchedPin = { ...pin, network: 'mainnet' as 'testnet' };
    expect(evaluateStatus(resolution('recipientA'), mismatchedPin)).toBe('NETWORK_MISMATCH');
  });

  it('returns RESOLUTION_UNAVAILABLE when resolution is null', () => {
    expect(evaluateStatus(null, pin)).toBe('RESOLUTION_UNAVAILABLE');
  });

  it('case-preserving: RecipientA != recipientA', () => {
    const mixedCasePin = { ...pin, destination: 'RecipientA' };
    expect(evaluateStatus(resolution('recipientA'), mixedCasePin)).toBe('DESTINATION_CHANGED');
  });

  it('returns IDENTITY_MISMATCH when the name differs', () => {
    expect(
      evaluateStatus({ ...resolution('recipientA'), name: 'someone-else.bdx' }, pin),
    ).toBe('IDENTITY_MISMATCH');
  });

  it('returns IDENTITY_MISMATCH when the mapping type differs', () => {
    expect(
      evaluateStatus(
        { ...resolution('recipientA'), mappingType: 'other' as 'wallet' },
        pin,
      ),
    ).toBe('IDENTITY_MISMATCH');
  });

  it('returns IDENTITY_MISMATCH when the fingerprint does not match', () => {
    expect(evaluateStatus(resolution('recipientA'), pin, false)).toBe('IDENTITY_MISMATCH');
  });

  it('treats names case-insensitively for identity', () => {
    const mixedNamePin = { ...pin, name: 'Merchant.BDX' };
    expect(evaluateStatus(resolution('recipientA'), mixedNamePin)).toBe('MATCHES_PIN');
  });

  it('lets a destination change take precedence over a fingerprint mismatch', () => {
    expect(evaluateStatus(resolution('recipientB'), pin, false)).toBe('DESTINATION_CHANGED');
  });
});

describe('compareResolutionToPin', () => {
  it('computes fingerprint match when destinations match', async () => {
    const pin = await matchingPin('recipientA');
    const result = await compareResolutionToPin(resolution('recipientA'), pin);
    expect(result.status).toBe('MATCHES_PIN');
    expect(result.identityMatches).toBe(true);
    expect(result.fingerprintMatch).toBe(true);
  });

  it('reports fingerprint mismatch when destination changed', async () => {
    const pin = await matchingPin('recipientA');
    const result = await compareResolutionToPin(resolution('recipientB'), pin);
    expect(result.status).toBe('DESTINATION_CHANGED');
    expect(result.identityMatches).toBe(true);
    expect(result.fingerprintMatch).toBe(false);
  });

  it('flags a tampered fingerprint even when the destination is unchanged', async () => {
    const pin = await matchingPin('recipientA');
    const result = await compareResolutionToPin(resolution('recipientA'), {
      ...pin,
      fingerprint: 'tampered',
    });
    expect(result.status).toBe('IDENTITY_MISMATCH');
    expect(result.fingerprintMatch).toBe(false);
  });

  it('flags a different resolved name as an identity mismatch', async () => {
    const pin = await matchingPin('recipientA');
    const result = await compareResolutionToPin(
      { ...resolution('recipientA'), name: 'other.bdx' },
      pin,
    );
    expect(result.status).toBe('IDENTITY_MISMATCH');
    expect(result.identityMatches).toBe(false);
  });

  it('preserves the original pin (no mutation)', async () => {
    const pin = await matchingPin('recipientA');
    const before = { ...pin };
    await compareResolutionToPin(resolution('recipientB'), pin);
    expect(pin).toEqual(before);
  });
});
