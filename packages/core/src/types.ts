export type Nettype = 'testnet';

export type MappingType = 'wallet';

export interface BnsResolution {
  name: string;
  destination: string;
  network: Nettype;
  mappingType: MappingType;
  verified: boolean;
  resolvedAt: number;
  durationMs: number;
}

export interface RecipientPin {
  id: string;
  account: string;
  network: Nettype;
  name: string;
  mappingType: MappingType;
  destination: string;
  fingerprint: string;
  approvedAt: number;
  lastCheckedAt: number;
}

export type RecipientStatus =
  | 'UNPINNED'
  | 'MATCHES_PIN'
  | 'DESTINATION_CHANGED'
  | 'RESOLUTION_UNAVAILABLE'
  | 'NETWORK_MISMATCH'
  | 'INVALID_NAME';

export interface ResolutionError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface ActivityEvent {
  id: string;
  type:
    | 'wallet_connected'
    | 'wallet_disconnected'
    | 'name_resolved'
    | 'recipient_pinned'
    | 'recipient_rechecked'
    | 'destination_changed'
    | 'destination_approved'
    | 'recipient_removed'
    | 'resolution_failed'
    | 'network_changed'
    | 'account_changed';
  name?: string;
  account?: string;
  destination?: string;
  previousDestination?: string;
  newDestination?: string;
  status?: RecipientStatus;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export const FINGERPRINT_VERSION = 'certora-v1';

export interface FingerprintInput {
  version: string;
  network: Nettype;
  name: string;
  mappingType: MappingType;
  destination: string;
}
