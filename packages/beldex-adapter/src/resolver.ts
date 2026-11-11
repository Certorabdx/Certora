import { checkAddress, isValidAddressShape } from '@bdxi/web3js';
import type { ResolveBnsResult } from '@bdxi/web3js';
import {
  isSupportedNetwork,
  requireTestnet,
  type BnsResolution,
  type Nettype,
} from '@certora/core';

/** Minimal structural interface for anything that can resolve a BNS name.
 *  Satisfied by BeldexWeb3 and by test mocks. */
type ResolverLike = {
  resolveBns(name: string): Promise<ResolveBnsResult>;
  getNetwork(): Promise<{ nettype: string }>;
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
 *
 * The provider network is checked before and after the resolution. A wallet
 * that is not on Testnet, changes network mid-resolution, returns a different
 * name, or returns a non-Testnet address shape produces an error instead of a
 * resolution object. Nothing is ever auto-approved from this result.
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

  if (!requireTestnet(network)) {
    throw new Error('Certora only resolves BNS names on Beldex Testnet.');
  }

  const requestedName = trimmedName(name);
  const start = Date.now();

  await requireProviderTestnet(web3);

  let result: { name: string; address: string; verified: boolean };
  try {
    result = await web3.resolveBns(requestedName);
  } catch (err) {
    throw new Error(`BNS resolution failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // The network may have changed while the resolver was in flight. Refuse to
  // return a result from a wallet that is no longer on Testnet.
  await requireProviderTestnet(web3);

  const durationMs = Date.now() - start;

  if (!result || typeof result.address !== 'string' || !result.address) {
    throw new Error('Resolver returned no destination for this name.');
  }

  if (typeof result.name !== 'string' || !result.name) {
    throw new Error('Resolver returned a destination without a name.');
  }

  if (trimmedName(result.name) !== requestedName) {
    throw new Error(
      `Resolver returned a different name (${result.name}) than the one requested (${requestedName}).`,
    );
  }

  const addressCheck = checkAddress(result.address, 'testnet');
  if (!addressCheck.valid) {
    throw new Error(
      `Resolver returned an invalid Testnet destination: ${addressCheck.reason ?? 'unknown reason'}.`,
    );
  }

  return {
    name: requestedName,
    destination: result.address,
    network,
    mappingType: 'wallet',
    // The wallet's resolver is an evidence source, not an on-chain proof.
    // Never upgrade this to true based on a wallet-provided flag.
    verified: false,
    resolvedAt: Date.now(),
    durationMs,
  };
}

/**
 * Read the provider network and require Testnet. A failed read is treated as
 * uncertain and blocks resolution.
 */
async function requireProviderTestnet(web3: ResolverLike): Promise<void> {
  let nettype: unknown;

  try {
    const network = await web3.getNetwork();
    nettype = network?.nettype;
  } catch {
    throw new Error(
      'Could not confirm the wallet network. Unlock the wallet and try again.',
    );
  }

  if (!isSupportedNetwork(nettype)) {
    const label = typeof nettype === 'string' && nettype ? nettype : 'unknown';
    throw new Error(
      `Wallet network is ${label}. Certora requires Beldex Testnet and will not switch networks.`,
    );
  }
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
