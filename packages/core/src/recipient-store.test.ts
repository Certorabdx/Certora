import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getPins,
  savePin,
  removePin,
  clearPins,
  getPinById,
  getPinByName,
  resetDb,
  validatePin,
  type RecipientPin,
} from './recipient-store';

const DB_NAME = 'certora';

const basePin: Omit<RecipientPin, 'id'> = {
  account: 'acct-1',
  network: 'testnet',
  name: 'merchant.bdx',
  mappingType: 'wallet',
  destination: 'recipientA',
  fingerprint: 'fp-a',
  approvedAt: 1000,
  lastCheckedAt: 1000,
};

async function deleteDatabase() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  resetDb();
  await deleteDatabase();
});

afterEach(async () => {
  resetDb();
  await deleteDatabase();
});

describe('recipient-store IndexedDB', () => {
  it('saves and retrieves a pin', async () => {
    const saved = await savePin(basePin);
    expect(saved.id).toBeDefined();
    expect(validatePin(saved)).toBe(true);

    const fetched = await getPinById(saved.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.destination).toBe('recipientA');
  });

  it('partitions pins by account', async () => {
    await savePin({ ...basePin, account: 'acct-1', name: 'a.bdx' });
    await savePin({ ...basePin, account: 'acct-2', name: 'a.bdx' });

    const acct1 = await getPins('acct-1', 'testnet');
    const acct2 = await getPins('acct-2', 'testnet');
    expect(acct1.length).toBe(1);
    expect(acct2.length).toBe(1);
  });

  it('partitions pins by network', async () => {
    await savePin({ ...basePin, network: 'testnet', name: 'a.bdx' });
    await savePin({ ...basePin, network: 'mainnet' as 'testnet', name: 'a.bdx' });

    const testnet = await getPins('acct-1', 'testnet');
    const mainnet = await getPins('acct-1', 'mainnet' as 'testnet');
    expect(testnet.length).toBe(1);
    expect(mainnet.length).toBe(1);
  });

  it('finds pin by name (case-insensitive)', async () => {
    await savePin({ ...basePin, name: 'Merchant.BDX' });
    const found = await getPinByName('acct-1', 'testnet', 'merchant.bdx');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Merchant.BDX');
  });

  it('removes a pin by id', async () => {
    const saved = await savePin(basePin);
    await removePin(saved.id);
    const fetched = await getPinById(saved.id);
    expect(fetched).toBeNull();
  });

  it('clears all pins for an account + network', async () => {
    await savePin({ ...basePin, name: 'a.bdx' });
    await savePin({ ...basePin, name: 'b.bdx' });
    const count = await clearPins('acct-1', 'testnet');
    expect(count).toBe(2);
    const remaining = await getPins('acct-1', 'testnet');
    expect(remaining.length).toBe(0);
  });

  it('persists across db reset (reopen)', async () => {
    const saved = await savePin(basePin);
    resetDb();
    const fetched = await getPinById(saved.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.destination).toBe('recipientA');
  });
});
