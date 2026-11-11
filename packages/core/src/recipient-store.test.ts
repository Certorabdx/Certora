import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getPins,
  savePin,
  removePin,
  clearPins,
  getPinById,
  getPinByName,
  resetDb,
  updateLastChecked,
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

  it('rejects a non-Testnet pin at the storage boundary', async () => {
    await expect(
      savePin({ ...basePin, network: 'mainnet' as 'testnet' }),
    ).rejects.toThrow(/Testnet/);
    await expect(getPins('acct-1', 'mainnet' as 'testnet')).rejects.toThrow(/Testnet/);
    expect(validatePin({ ...basePin, id: 'pin-1', network: 'mainnet' })).toBe(false);
  });

  it('rejects a duplicate account + network + name (case-insensitive)', async () => {
    await savePin({ ...basePin, name: 'merchant.bdx' });

    await expect(
      savePin({ ...basePin, name: 'Merchant.BDX', destination: 'recipientB' }),
    ).rejects.toThrow(/already pinned/);

    const pins = await getPins('acct-1', 'testnet');
    expect(pins.length).toBe(1);
    expect(pins[0].destination).toBe('recipientA');
  });

  it('allows updating the same pin id', async () => {
    const saved = await savePin(basePin);
    await savePin({ ...basePin, id: saved.id, destination: 'recipientB' });

    const pins = await getPins('acct-1', 'testnet');
    expect(pins.length).toBe(1);
    expect(pins[0].destination).toBe('recipientB');
  });

  it('updates lastCheckedAt atomically', async () => {
    const saved = await savePin({ ...basePin, lastCheckedAt: 1 });
    await updateLastChecked(saved.id);
    const fetched = await getPinById(saved.id);
    expect(fetched!.lastCheckedAt).toBeGreaterThan(1);
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
