import type { BnsResolution, RecipientPin, RecipientStatus } from './types';
import { generateFingerprint } from './fingerprint';

/**
 * Evaluate the current resolution against a saved pin and return a status.
 *
 * Statuses:
 *   - MATCHES_PIN: exact destination matches the saved pin
 *   - DESTINATION_CHANGED: destination differs from the saved pin
 *   - RESOLUTION_UNAVAILABLE: no pin exists yet (unpinned) or resolution failed
 *
 * The original pin is never modified by this function.
 */
export function evaluateStatus(
  resolution: BnsResolution | null,
  pin: RecipientPin | null,
): RecipientStatus {
  if (!resolution) {
    return 'RESOLUTION_UNAVAILABLE';
  }

  if (!pin) {
    return 'UNPINNED';
  }

  // Network must match for a meaningful comparison.
  if (pin.network !== resolution.network) {
    return 'NETWORK_MISMATCH';
  }

  // Exact destination string comparison (case-preserving).
  if (pin.destination === resolution.destination) {
    return 'MATCHES_PIN';
  }

  return 'DESTINATION_CHANGED';
}

/**
 * Compare two destination strings exactly (case-preserving).
 */
export function destinationsMatch(a: string, b: string): boolean {
  return a === b;
}

/**
 * Build a comparison result with both old and new destinations for UI display.
 */
export interface ComparisonResult {
  status: RecipientStatus;
  pin: RecipientPin | null;
  resolution: BnsResolution | null;
  fingerprintMatch: boolean;
}

export async function compareResolutionToPin(
  resolution: BnsResolution | null,
  pin: RecipientPin | null,
): Promise<ComparisonResult> {
  let fingerprintMatch = false;

  if (resolution && pin) {
    const currentFingerprint = await generateFingerprint({
      version: 'certora-v1',
      network: resolution.network,
      name: resolution.name,
      mappingType: resolution.mappingType,
      destination: resolution.destination,
    });
    fingerprintMatch = currentFingerprint === pin.fingerprint;
  }

  const status = evaluateStatus(resolution, pin);

  return {
    status,
    pin,
    resolution,
    fingerprintMatch,
  };
}
