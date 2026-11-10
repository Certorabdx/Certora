import type { RecipientPin, ActivityEvent, Nettype } from './types';
export type { RecipientPin };

const DB_NAME = 'certora';
const DB_VERSION = 1;
const STORE_NAME = 'recipientPins';

type Db = IDBDatabase;

let openRequest: IDBOpenDBRequest | null = null;
let dbPromise: Promise<Db> | null = null;

/**
 * Open (or create) the IndexedDB database with schema versioning.
 */
function openDb(): Promise<Db> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = (indexedDB.open(DB_NAME, DB_VERSION) as unknown) as IDBOpenDBRequest;
    openRequest = request;

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('account', 'account', { unique: false });
        store.createIndex('network', 'network', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Close the open database connection and reset the cache.
 * Used between tests and when the account changes.
 */
export function resetDb(): void {
  if (openRequest) {
    try {
      openRequest.result?.close();
    } catch {
      // Ignore close errors.
    }
    openRequest = null;
  }
  dbPromise = null;
}

/**
 * Generate a simple UUID v4.
 */
function uuid(): string {
  return crypto.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) || 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Get all pins for a given account + network partition.
 */
export async function getPins(account: string, network: Nettype): Promise<RecipientPin[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('account');
    const request = index.getAll(IDBKeyRange.only(account));

    request.onsuccess = () => {
      const all = request.result as RecipientPin[];
      resolve(all.filter((p) => p.network === network));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single pin by id.
 */
export async function getPinById(id: string): Promise<RecipientPin | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as RecipientPin | null ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a pin by account + network + name (one approved destination per name per account).
 */
export async function getPinByName(
  account: string,
  network: Nettype,
  name: string,
): Promise<RecipientPin | null> {
  const pins = await getPins(account, network);
  return pins.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? null;
}

/**
 * Save (create or replace explicitly) a recipient pin.
 * This is only called after explicit user approval — never automatically.
 * A UUID id is generated when the pin has none.
 */
export type RecipientPinInput = Omit<RecipientPin, 'id'> & { id?: string };

export async function savePin(pin: RecipientPinInput): Promise<RecipientPin> {
  const record = { ...pin, id: pin.id ?? uuid() };
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove a pin by id.
 */
export async function removePin(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all pins for a given account + network partition (deliberate data clearing).
 */
export async function clearPins(account: string, network: Nettype): Promise<number> {
  const pins = await getPins(account, network);
  for (const pin of pins) {
    await removePin(pin.id);
  }
  return pins.length;
}

/**
 * Update the lastCheckedAt timestamp on a pin.
 */
export async function updateLastChecked(id: string): Promise<void> {
  const pin = await getPinById(id);
  if (!pin) return;
  await savePin({ ...pin, lastCheckedAt: Date.now() });
}

/**
 * Activity events are kept in memory only (not persisted to IndexedDB in MVP)
 * to keep scope tight. They are passed up to the UI layer which persists them
 * in application state.
 */
export interface ActivityEventInput {
  type: ActivityEvent['type'];
  name?: string;
  account?: string;
  destination?: string;
  previousDestination?: string;
  newDestination?: string;
  metadata?: Record<string, unknown>;
}

export function makeActivityEvent(input: {
  type: ActivityEvent['type'];
  account?: string;
  name?: string;
  destination?: string;
  previousDestination?: string;
  newDestination?: string;
  metadata?: Record<string, unknown>;
}): ActivityEvent {
  return {
    id: uuid(),
    type: input.type,
    account: input.account ?? undefined,
    name: input.name ?? undefined,
    destination: input.destination ?? undefined,
    previousDestination: input.previousDestination ?? undefined,
    newDestination: input.newDestination ?? undefined,
    metadata: input.metadata ?? {},
    timestamp: Date.now(),
  };
}

/**
 * Validate a RecipientPin shape.
 */
export function validatePin(pin: unknown): pin is RecipientPin {
  if (!pin || typeof pin !== 'object') return false;
  const p = pin as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.account === 'string' &&
    (p.network === 'testnet' || p.network === 'mainnet') &&
    typeof p.name === 'string' &&
    typeof p.mappingType === 'string' &&
    typeof p.destination === 'string' &&
    typeof p.fingerprint === 'string' &&
    typeof p.approvedAt === 'number' &&
    typeof p.lastCheckedAt === 'number'
  );
}
