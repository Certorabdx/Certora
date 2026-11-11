import { isSupportedNetwork, type Nettype, type RecipientStatus } from './types';

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
 * Rule: Mainnet and unknown networks are rejected. Recipient approval and
 * rechecks are disabled unless the network is confirmed as Testnet.
 */
export function requireTestnet(network: unknown): network is Nettype {
  return isSupportedNetwork(network);
}

/**
 * Map a comparison outcome plus resolution availability to a status,
 * enforcing the safety policies.
 *
 * `identityMatches` covers the name and mapping type that identify what was
 * approved. `fingerprintMatch` covers the full fingerprinted payload, including
 * the exact destination. A fingerprint mismatch is treated as an identity
 * problem so the UI never offers a one-click replacement for an uncertain
 * record.
 */
export function determineStatus({
  resolutionAvailable,
  pinExists,
  destinationsMatch,
  networkMatches,
  identityMatches,
  fingerprintMatch,
}: {
  resolutionAvailable: boolean;
  pinExists: boolean;
  destinationsMatch?: boolean;
  networkMatches?: boolean;
  identityMatches?: boolean;
  fingerprintMatch?: boolean;
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

  if (identityMatches === false) {
    return 'IDENTITY_MISMATCH';
  }

  if (destinationsMatch === false) {
    return 'DESTINATION_CHANGED';
  }

  if (fingerprintMatch === false) {
    return 'IDENTITY_MISMATCH';
  }

  return 'MATCHES_PIN';
}
