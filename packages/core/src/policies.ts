import type { RecipientStatus } from './types';

/**
 * Safety policies for Certora's recipient protection engine.
 *
 * These rules are absolute and must never be bypassed by the UI or adapter.
 */

/**
 * Rule: never silently replace an existing pin.
 * When a destination changes, the old pin must remain intact until the user
 * explicitly approves the new destination.
 */
export const NO_AUTOMATIC_PIN_REPLACEMENT = true;

/**
 * Rule: a failed or uncertain resolution must never become an approved
 * recipient. Return RESOLUTION_UNAVAILABLE and preserve the original pin.
 */
export const FAILED_RESOLUTION_NEVER_APPROVED = true;

/**
 * Rule: Mainnet is rejected; recipient approval is disabled when the network
 * cannot be confirmed as testnet.
 */
export function requireTestnet(network: string): network is 'testnet' {
  return network === 'testnet';
}

/**
 * Map a comparison outcome plus resolution availability to a status,
 * enforcing the safety policies.
 */
export function determineStatus({
  resolutionAvailable,
  pinExists,
  destinationsMatch,
  networkMatches,
}: {
  resolutionAvailable: boolean;
  pinExists: boolean;
  destinationsMatch?: boolean;
  networkMatches?: boolean;
}): RecipientStatus {
  if (!resolutionAvailable) {
    return 'RESOLUTION_UNAVAILABLE';
  }

  if (!pinExists) {
    return 'UNPINNED';
  }

  if (networkMatches === false) {
    return 'NETWORK_MISMATCH';
  }

  if (destinationsMatch === false) {
    return 'DESTINATION_CHANGED';
  }

  return 'MATCHES_PIN';
}
