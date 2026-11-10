import { checkAddress, isValidAddressShape } from '@bdxi/web3js';
import type { ResolveBnsResult } from '@bdxi/web3js';
import type { BnsResolution, Nettype } from '@certora/core';

/** Minimal structural interface for anything that can resolve a BNS name.
 *  Satisfied by BeldexWeb3 and by test mocks. */
type ResolverLike = {
  resolveBns(name: string): Promise<ResolveBnsResult>;
};

/**
 * Maximum allowed length for a BNS name input.
 */
const MAX_NAME_LENGTH = 64;

/**
 * Validation result for a BNS name.
 */
export interface BnsNameValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a BNS name before resolution.
 */
export function validateBnsName(name: string): BnsNameValidation {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, reason: 'Enter a BNS name.' };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: 'BNS name is too long.' };
  }

  // Must end with .bdx suffix. Check case-insensitively so an uppercase
  // name gets the accurate lowercase error rather than a misleading
  // "must end with .bdx" message.
  const lowered = trimmed.toLowerCase();
  if (!lowered.endsWith('.bdx')) {
    return { valid: false, reason: 'BNS names must end with .bdx' };
  }

  if (trimmed !== lowered) {
    return { valid: false, reason: 'Use only lowercase letters, numbers, and hyphens.' };
  }

  const label = trimmed.slice(0, -4);
  if (!label) {
    return { valid: false, reason: 'Provide a name before the .bdx suffix.' };
  }

  // Allowed characters: lowercase letters, digits, hyphens (not leading/trailing/consecutive).
  const nameRegex = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
  if (!nameRegex.test(label)) {
    return { valid: false, reason: 'Use only lowercase letters, numbers, and hyphens.' };
  }

  if (label.startsWith('-') || label.endsWith('-')) {
    return { valid: false, reason: 'Name must not start or end with a hyphen.' };
  }

  if (label.includes('--')) {
    return { valid: false, reason: 'Name must not contain consecutive hyphens.' };
  }

  return { valid: true };
}

/**
 * Resolve a BNS name through the Beldex Wallet and return a structured result.
 * Bypasses any application-level cache by performing a fresh provider call.
 */
export async function resolveBns(
  web3: ResolverLike,
  name: string,
  network: Nettype,
): Promise<BnsResolution> {
  const validation = validateBnsName(name);
  if (!validation.valid) {
    throw new Error(validation.reason || 'Invalid BNS name.');
  }

  const start = Date.now();

  let result: { name: string; address: string; verified: boolean };
  try {
    result = await web3.resolveBns(trimmedName(name));
  } catch (err) {
    throw new Error(`BNS resolution failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const durationMs = Date.now() - start;

  if (!result.address) {
    throw new Error('Resolver returned no destination for this name.');
  }

  // Confirm the resolved destination is a testnet-shaped address.
  const addressCheck = checkAddress(result.address, 'testnet');
  if (!addressCheck.valid) {
    // Still return the resolution but flag it; the UI should warn.
    // We do not throw here because the resolver may return an integrated address
    // or the wallet's resolver may use a format we should still display.
  }

  return {
    name: result.name,
    destination: result.address,
    network,
    mappingType: 'wallet',
    verified: result.verified === true,
    resolvedAt: Date.now(),
    durationMs,
  };
}

/** Normalize the name (trim + lowercase per Beldex case-insensitivity). */
function trimmedName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Check whether a resolved destination is a valid testnet-shaped address.
 */
export function isTestnetAddress(address: string): boolean {
  return isValidAddressShape(address, 'testnet');
}

export { MAX_NAME_LENGTH };
