import { describe, it, expect } from 'vitest';
import { determineStatus, requireTestnet } from './policies';

describe('requireTestnet', () => {
  it('accepts only Testnet', () => {
    expect(requireTestnet('testnet')).toBe(true);
    expect(requireTestnet('mainnet')).toBe(false);
    expect(requireTestnet('unknown')).toBe(false);
    expect(requireTestnet(null)).toBe(false);
    expect(requireTestnet(undefined)).toBe(false);
  });
});

describe('determineStatus', () => {
  it('returns RESOLUTION_UNAVAILABLE before considering the pin', () => {
    expect(
      determineStatus({ resolutionAvailable: false, pinExists: true }),
    ).toBe('RESOLUTION_UNAVAILABLE');
  });

  it('returns UNPINNED when no pin exists', () => {
    expect(determineStatus({ resolutionAvailable: true, pinExists: false })).toBe('UNPINNED');
  });

  it('checks network, identity, destination, then fingerprint', () => {
    expect(
      determineStatus({
        resolutionAvailable: true,
        pinExists: true,
        networkMatches: false,
        identityMatches: false,
        destinationsMatch: false,
        fingerprintMatch: false,
      }),
    ).toBe('NETWORK_MISMATCH');

    expect(
      determineStatus({
        resolutionAvailable: true,
        pinExists: true,
        networkMatches: true,
        identityMatches: false,
        destinationsMatch: false,
        fingerprintMatch: false,
      }),
    ).toBe('IDENTITY_MISMATCH');

    expect(
      determineStatus({
        resolutionAvailable: true,
        pinExists: true,
        networkMatches: true,
        identityMatches: true,
        destinationsMatch: false,
        fingerprintMatch: false,
      }),
    ).toBe('DESTINATION_CHANGED');

    expect(
      determineStatus({
        resolutionAvailable: true,
        pinExists: true,
        networkMatches: true,
        identityMatches: true,
        destinationsMatch: true,
        fingerprintMatch: false,
      }),
    ).toBe('IDENTITY_MISMATCH');

    expect(
      determineStatus({
        resolutionAvailable: true,
        pinExists: true,
        networkMatches: true,
        identityMatches: true,
        destinationsMatch: true,
        fingerprintMatch: true,
      }),
    ).toBe('MATCHES_PIN');
  });
});
