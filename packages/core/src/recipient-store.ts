import { isSupportedNetwork, type RecipientPin, type ActivityEvent, type Nettype } from './types';
export type { RecipientPin };

const DB_NAME = 'certora';
const DB_VERSION = 1;
const STORE_NAME = 'recipientPins';

type Db = IDBDatabase;

let dbInstance: Db | null = null;
let dbPromise: Promise<Db> | null = null;

/**
 * Reject any network that is not Certora's supported Testnet. This is a
 * runtime guard at the storage boundary: the TypeScript types alone can be
 * bypassed by casts, persisted data, or adapter bugs.
 */
export function assertSupportedNetwork(network: unknown): Nettype {
  if (!isSupportedNetwork(network)) {
    throw new Error('Certora only stores and compares recipients on Beldex Testnet.');
  }
  return network;
}

/**
 * Open (or create) the IndexedDB database with schema versioning.
 */
function openDb(): Promise<Db> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = (indexedDB.open(DB_NAME, DB_VERSION) as unknown) as IDBOpenDBRequest;

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

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
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors.
    }
  }
  dbInstance = null;
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
 * Reject a transaction with a descriptive error, then abort it.
 */
function failTransaction(tx: IDBTransaction, failure: { error: Error | null }, error: Error): void {
  failure.error ??= error;
  try {
    tx.abort();
  } catch {
    // The transaction may already be aborting; the onabort handler reports it.
  }
}

/**
 * Get all pins for a given account + network partition.
 */
export async function getPins(account: string, network: Nettype): Promise<RecipientPin[]> {
  const supportedNetwork = assertSupportedNetwork(network);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('account');
    const request = index.getAll(IDBKeyRange.only(account));

    request.onsuccess = () => {
      const all = request.result as RecipientPin[];
      resolve(all.filter((p) => p.network === supportedNetwork));
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
    request.onsuccess = () => resolve((request.result as RecipientPin | undefined) ?? null);
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
 *
 * The read/check/write sequence happens inside one readwrite transaction, so
 * two concurrent approvals for the same account + network + name cannot both
 * create a second pin.
 */
export type RecipientPinInput = Omit<RecipientPin, 'id'> & { id?: string };

export async function savePin(pin: RecipientPinInput): Promise<RecipientPin> {
  const network = assertSupportedNetwork(pin.network);
  const record: RecipientPin = {
    ...pin,
    id: pin.id ?? uuid(),
    network,
  };

  if (!validatePin(record)) {
    throw new Error('Refusing to save a pin with an invalid shape.');
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const failure: { error: Error | null } = { error: null };
    let saved: RecipientPin | null = null;

    tx.oncomplete = () => {
      if (failure.error) {
        reject(failure.error);
      } else if (saved) {
        resolve(saved);
      } else {
        reject(new Error('Pin transaction completed without saving a record.'));
      }
    };
    tx.onerror = () => {
      failure.error ??= tx.error ?? new Error('Failed to save the recipient pin.');
    };
    tx.onabort = () => {
      reject(failure.error ?? tx.error ?? new Error('Saving the recipient pin was aborted.'));
    };

    const request = store.index('account').getAll(IDBKeyRange.only(record.account));
    request.onerror = () => {
      failTransaction(tx, failure, request.error ?? new Error('Failed to inspect existing pins.'));
    };
    request.onsuccess = () => {
      const existing = request.result as RecipientPin[];
      const normalizedName = record.name.trim().toLowerCase();
      const duplicate = existing.find(
        (p) =>
          p.id !== record.id &&
          p.network === record.network &&
          p.name.trim().toLowerCase() === normalizedName,
      );

      if (duplicate) {
        failTransaction(
          tx,
          failure,
          new Error(
            `A recipient named "${record.name}" is already pinned for this account and network.`,
          ),
        );
        return;
      }

      const put = store.put(record);
      put.onsuccess = () => {
        saved = record;
      };
      put.onerror = () => {
        failTransaction(tx, failure, put.error ?? new Error('Failed to write the recipient pin.'));
      };
    };
  });
}

/**
 * Remove a pin by id. Resolves only after the transaction commits.
 */
export async function removePin(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to remove the recipient pin.'));
    tx.onabort = () => reject(tx.error ?? new Error('Removing the recipient pin was aborted.'));
  });
}

/**
 * Clear all pins for a given account + network partition (deliberate data
 * clearing). The lookup and deletes run in one transaction so a failed clear
 * cannot leave a half-deleted partition behind.
 */
export async function clearPins(account: string, network: Nettype): Promise<number> {
  const supportedNetwork = assertSupportedNetwork(network);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let count = 0;

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear recipient pins.'));
    tx.onabort = () => reject(tx.error ?? new Error('Clearing recipient pins was aborted.'));

    const request = store.index('account').getAll(IDBKeyRange.only(account));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const pins = (request.result as RecipientPin[]).filter(
        (p) => p.network === supportedNetwork,
      );
      count = pins.length;
      for (const pin of pins) {
        store.delete(pin.id);
      }
    };
  });
}

/**
 * Update the lastCheckedAt timestamp on a pin in a single transaction.
 */
export async function updateLastChecked(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const failure: { error: Error | null } = { error: null };

    tx.oncomplete = () => {
      if (failure.error) reject(failure.error);
      else resolve();
    };
    tx.onerror = () => {
      failure.error ??= tx.error ?? new Error('Failed to update the pin timestamp.');
    };
    tx.onabort = () => {
      reject(failure.error ?? tx.error ?? new Error('Updating the pin timestamp was aborted.'));
    };

    const request = store.get(id);
    request.onerror = () => {
      failTransaction(tx, failure, request.error ?? new Error('Failed to read the recipient pin.'));
    };
    request.onsuccess = () => {
      const pin = request.result as RecipientPin | undefined;
      if (!pin) return;
      if (!validatePin(pin)) {
        failTransaction(tx, failure, new Error('Refusing to update an invalid recipient pin.'));
        return;
      }
      store.put({ ...pin, lastCheckedAt: Date.now() });
    };
  });
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
 * Validate a RecipientPin shape, including the Testnet-only policy.
 */
export function validatePin(pin: unknown): pin is RecipientPin {
  if (!pin || typeof pin !== 'object') return false;
  const p = pin as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.account === 'string' &&
    p.account.length > 0 &&
    isSupportedNetwork(p.network) &&
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    p.mappingType === 'wallet' &&
    typeof p.destination === 'string' &&
    p.destination.length > 0 &&
    typeof p.fingerprint === 'string' &&
    p.fingerprint.length > 0 &&
    typeof p.approvedAt === 'number' &&
    Number.isFinite(p.approvedAt) &&
    typeof p.lastCheckedAt === 'number' &&
    Number.isFinite(p.lastCheckedAt)
  );
}
