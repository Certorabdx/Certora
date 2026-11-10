import type { FingerprintInput } from './types';
import { FINGERPRINT_VERSION } from './types';

/**
 * Create a SHA-256 fingerprint for reliable application-level comparison.
 *
 * The fingerprint is computed over:
 *   - product-specific fingerprint version
 *   - network
 *   - BNS name
 *   - mapping type
 *   - exact destination
 *
 * The original Beldex destination string is preserved (not lowercased).
 * This fingerprint is for application-level comparison only. It is NOT a
 * blockchain proof and does not independently validate identity or authenticity.
 */
export async function generateFingerprint(input: FingerprintInput): Promise<string> {
  const payload = JSON.stringify({
    version: input.version,
    network: input.network,
    name: input.name,
    mappingType: input.mappingType,
    destination: input.destination,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function makeFingerprintInput(input: {
  name: string;
  network: 'testnet';
  mappingType: 'wallet';
  destination: string;
}): FingerprintInput {
  return {
    version: FINGERPRINT_VERSION,
    network: input.network,
    name: input.name,
    mappingType: input.mappingType,
    destination: input.destination,
  };
}
