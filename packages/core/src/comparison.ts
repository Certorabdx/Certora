import { determineStatus } from './policies';
import type { BnsResolution, RecipientPin, RecipientStatus } from './types';
import { FINGERPRINT_VERSION } from './types';
import { generateFingerprint } from './fingerprint';

/**
 * Evaluate the current resolution against a saved pin and return a status.
 *
 * Statuses:
 *   - MATCHES_PIN: the identity and exact destination match the saved pin
 *   - DESTINATION_CHANGED: the destination differs from the saved pin
 *   - IDENTITY_MISMATCH: the name, mapping type, or fingerprint differs
 *   - NETWORK_MISMATCH: the resolution came from a different network
 *   - RESOLUTION_UNAVAILABLE: resolution failed or no pin exists yet
 *
 * The original pin is never modified by this function.
 */
export function evaluateStatus(
  resolution: BnsResolution | null,
  pin: RecipientPin | null,
  fingerprintMatch?: boolean,
): RecipientStatus {
  if (!resolution) {
    return determineStatus({
      resolutionAvailable: false,
      pinExists: pin !== null,
    });
  }

  if (!pin) {
    return 'UNPINNED';
  }

  return determineStatus({
    resolutionAvailable: true,
    pinExists: true,
    networkMatches: pin.network === resolution.network,
    identityMatches:
      namesMatch(pin.name, resolution.name) && pin.mappingType === resolution.mappingType,
    destinationsMatch: destinationsMatch(pin.destination, resolution.destination),
    fingerprintMatch,
  });
}

/**
 * Compare two destination strings exactly (case-preserving).
 */
export function destinationsMatch(a: string, b: string): boolean {
  return a === b;
}

/**
 * Compare BNS names using the network's case-insensitive semantics.
 */
export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Build a comparison result with both old and new destinations for UI display.
 */
export interface ComparisonResult {
  status: RecipientStatus;
  pin: RecipientPin | null;
  resolution: BnsResolution | null;
  identityMatches: boolean;
  fingerprintMatch: boolean;
}

export async function compareResolutionToPin(
  resolution: BnsResolution | null,
  pin: RecipientPin | null,
): Promise<ComparisonResult> {
  const identityMatches =
    !!resolution &&
    !!pin &&
    pin.network === resolution.network &&
    namesMatch(pin.name, resolution.name) &&
    pin.mappingType === resolution.mappingType;

  let fingerprintMatch = false;

  if (resolution && pin) {
    const currentFingerprint = await generateFingerprint({
      version: FINGERPRINT_VERSION,
      network: resolution.network,
      name: resolution.name,
      mappingType: resolution.mappingType,
      destination: resolution.destination,
    });
    fingerprintMatch = currentFingerprint === pin.fingerprint;
  }

  const status = evaluateStatus(resolution, pin, fingerprintMatch);

  return {
    status,
    pin,
    resolution,
    identityMatches,
    fingerprintMatch,
  };
}
