/**
 * E2E tests for Certora's core wallet → resolve → pin → change → reapprove flow.
 *
 * These tests use a MOCK wallet provider (enabled via the `?mock=1` query
 * parameter). They are clearly labeled as mocked tests and do NOT establish
 * live testnet operation. They verify the UI wiring and workflow logic only.
 *
 * The mock uses Testnet-shaped addresses (base58, 9-prefix, 95 chars) so the
 * same address validation used in production is exercised here.
 */
import { test, expect, type Page } from '@playwright/test';

const ADDRESS_A = `9${'A'.repeat(94)}`;
const ADDRESS_B = `9${'B'.repeat(94)}`;
const WALLET_ADDRESS = `9${'C'.repeat(94)}`;
const OTHER_WALLET_ADDRESS = `9${'D'.repeat(94)}`;

test.use({ storageState: { cookies: [], origins: [] }, reducedMotion: 'reduce' });

// Clear IndexedDB once per test (initial navigation), not on every reload.
// This keeps the reload-persistence test meaningful while still isolating
// tests that share the same Playwright context.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('certora-e2e-db-cleared') === '1') return;
    sessionStorage.setItem('certora-e2e-db-cleared', '1');
    const req = indexedDB.deleteDatabase('certora');
    req.onsuccess = () => {};
    req.onerror = () => {};
    req.onblocked = () => {};
  });
});

async function resolveAndPin(page: Page, name: string, address: string) {
  await page.getByPlaceholder('e.g. merchant.bdx').fill(name);
  await page.getByRole('button', { name: /^resolve$/i }).click();
  await page.getByText(address).first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /pin recipient/i }).click();
  await page.getByRole('button', { name: /^approve & pin$/i }).click();
  await page.waitForURL('**/recipients');
}

test.describe('Certora mock-wallet flow', () => {
  test('connect, resolve, pin, reload persistence', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });

    // Testnet indicator is present (sidebar badge).
    await expect(page.getByText('Beldex Testnet').first()).toBeVisible();

    // Resolve a BNS name.
    await page.getByPlaceholder('e.g. merchant.bdx').fill('merchant.bdx');
    await page.getByRole('button', { name: /^resolve$/i }).click();
    await page.getByText(ADDRESS_A).first().waitFor({ state: 'visible' });

    // Approve & pin.
    const approveBtn = page.locator('button').filter({ hasText: /pin recipient/i });
    await approveBtn.waitFor({ state: 'visible' });
    await approveBtn.click();
    await page.getByRole('button', { name: /^approve & pin$/i }).click();

    // Confirmation toast.
    await expect(page.getByText('Recipient pinned')).toBeVisible();

    // Navigate to Protected Recipients and confirm the pin is listed.
    await page.getByRole('link', { name: /Protected Recipients/ }).click();
    await expect(page.getByRole('link', { name: 'merchant.bdx' })).toBeVisible();

    // Reload with mock mode enabled (the in-app navigation drops the query
    // string) and confirm the pin survives a real document reload.
    await page.goto('/recipients?mock=1', { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'merchant.bdx' })).toBeVisible();
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: 'merchant.bdx' })).toBeVisible();
  });

  test('destination change detection and reapproval', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });

    await page.evaluate(
      ({ address }) => {
        const w = (
          window as unknown as {
            __mockWallet?: { setResolveResult: (a: string, b: string) => void };
          }
        ).__mockWallet;
        if (!w) throw new Error('Mock wallet not exposed');
        w.setResolveResult('bob.bdx', address);
      },
      { address: ADDRESS_A },
    );

    // Resolve and pin recipient A for bob.bdx.
    await page.getByPlaceholder('e.g. merchant.bdx').fill('bob.bdx');
    await page.getByRole('button', { name: /^resolve$/i }).click();
    await page.getByText(ADDRESS_A).first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /pin recipient/i }).click();
    await page.getByRole('button', { name: /^approve & pin$/i }).click();
    await expect(page.getByText('Recipient pinned')).toBeVisible();
    await page.waitForURL('**/recipients');

    // Simulate an on-chain mapping change performed outside Certora.
    await page.evaluate(
      ({ address }) => {
        const w = (
          window as unknown as {
            __mockWallet?: { setResolveResult: (a: string, b: string) => void };
          }
        ).__mockWallet;
        w.setResolveResult('bob.bdx', address);
      },
      { address: ADDRESS_B },
    );

    const bobLink = page.getByRole('link', { name: 'bob.bdx' });
    await bobLink.waitFor({ state: 'visible' });
    await bobLink.click();
    await page.getByRole('button', { name: /recheck destination/i }).click();

    await expect(page.getByText('Destination changed since approval')).toBeVisible();
    await expect(page.getByText(ADDRESS_A).first()).toBeVisible();
    await expect(page.getByText(ADDRESS_B).first()).toBeVisible();

    // Approve the new destination.
    await page.getByRole('button', { name: /review & approve new destination/i }).click();
    await page.getByRole('button', { name: /^approve new destination$/i }).click();
    await expect(page.getByText('Destination approved')).toBeVisible();

    // Recheck again → matches.
    await page.getByRole('button', { name: /recheck destination/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Matches your approved recipient' }),
    ).toBeVisible();
  });

  test('changing the input invalidates the previous resolution', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });

    await page.getByPlaceholder('e.g. merchant.bdx').fill('merchant.bdx');
    await page.getByRole('button', { name: /^resolve$/i }).click();
    await expect(page.getByText(ADDRESS_A).first()).toBeVisible();

    // The old receipt must disappear as soon as the input no longer matches
    // the resolved name — before a new resolution is requested.
    await page.getByPlaceholder('e.g. merchant.bdx').fill('another-name.bdx');
    await expect(page.getByText(ADDRESS_A)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /pin recipient/i })).toHaveCount(0);
    await expect(page.getByText('Resolution receipt')).toHaveCount(0);
  });

  test('wallet network change to Mainnet blocks operations', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });
    await expect(page.getByPlaceholder('e.g. merchant.bdx')).toBeVisible();

    await page.evaluate(() => {
      const w = (
        window as unknown as {
          __mockWallet?: { setNetwork: (network: 'mainnet' | 'testnet') => void };
        }
      ).__mockWallet;
      if (!w) throw new Error('Mock wallet not exposed');
      w.setNetwork('mainnet');
    });

    await expect(page.getByText('Unsupported network')).toBeVisible();
    await expect(page.getByText('Mainnet — rejected')).toBeVisible();
    await expect(page.getByRole('button', { name: /^resolve$/i })).toHaveCount(0);

    // Returning to Testnet restores the form without any silent coercion.
    await page.evaluate(() => {
      const w = (
        window as unknown as {
          __mockWallet?: { setNetwork: (network: 'mainnet' | 'testnet') => void };
        }
      ).__mockWallet;
      w.setNetwork('testnet');
    });
    await expect(page.getByPlaceholder('e.g. merchant.bdx')).toBeVisible();
    await expect(page.getByText('Mainnet — rejected')).toHaveCount(0);
  });

  test('account switch isolates pins and restoring the account restores them', async ({
    page,
  }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });
    await resolveAndPin(page, 'merchant.bdx', ADDRESS_A);
    await expect(page.getByRole('link', { name: 'merchant.bdx' })).toBeVisible();

    await page.evaluate(
      ({ address }) => {
        const w = (
          window as unknown as {
            __mockWallet?: { setAddress: (address: string | null) => void };
          }
        ).__mockWallet;
        if (!w) throw new Error('Mock wallet not exposed');
        w.setAddress(address);
      },
      { address: OTHER_WALLET_ADDRESS },
    );

    await expect(page.getByText('No protected recipients')).toBeVisible();
    await expect(page.getByRole('link', { name: 'merchant.bdx' })).toHaveCount(0);

    await page.evaluate(
      ({ address }) => {
        const w = (
          window as unknown as {
            __mockWallet?: { setAddress: (address: string | null) => void };
          }
        ).__mockWallet;
        if (!w) throw new Error('Mock wallet not exposed');
        w.setAddress(address);
      },
      { address: WALLET_ADDRESS },
    );

    await expect(page.getByRole('link', { name: 'merchant.bdx' })).toBeVisible();
  });

  test('a failed recheck preserves the approved pin', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });
    await resolveAndPin(page, 'merchant.bdx', ADDRESS_A);

    await page.getByRole('link', { name: 'merchant.bdx' }).click();
    await expect(page.getByText(ADDRESS_A).first()).toBeVisible();

    await page.evaluate(() => {
      const w = (
        window as unknown as {
          __mockWallet?: { setRejecting: (reject: boolean) => void };
        }
      ).__mockWallet;
      if (!w) throw new Error('Mock wallet not exposed');
      w.setRejecting(true);
    });

    await page.getByRole('button', { name: /recheck destination/i }).click();
    await expect(
      page.getByRole('heading', { name: 'Resolution unavailable' }),
    ).toBeVisible();
    await expect(page.getByText('Your approved pin is preserved.').first()).toBeVisible();
    await expect(page.getByText(ADDRESS_A).first()).toBeVisible();
  });

  test('recheck state from recipient A does not leak into recipient B', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });
    await resolveAndPin(page, 'alice.bdx', ADDRESS_A);

    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });
    await page.evaluate(
      ({ address }) => {
        const w = (
          window as unknown as {
            __mockWallet?: { setResolveResult: (a: string, b: string) => void };
          }
        ).__mockWallet;
        if (!w) throw new Error('Mock wallet not exposed');
        w.setResolveResult('bob.bdx', address);
      },
      { address: ADDRESS_A },
    );
    await resolveAndPin(page, 'bob.bdx', ADDRESS_A);

    // Only alice changes; bob still resolves to the pinned address.
    await page.evaluate(
      ({ address }) => {
        const w = (
          window as unknown as {
            __mockWallet?: { setResolveResult: (a: string, b: string) => void };
          }
        ).__mockWallet;
        w.setResolveResult('alice.bdx', address);
      },
      { address: ADDRESS_B },
    );

    await page.getByRole('link', { name: 'alice.bdx' }).click();
    await page.getByRole('button', { name: /recheck destination/i }).click();
    await expect(page.getByText('Destination changed since approval')).toBeVisible();

    // Navigate directly to bob's record. No state from alice may survive.
    await page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByRole('link', { name: 'Protected recipients' })
      .click();
    await page.getByRole('link', { name: 'bob.bdx' }).click();
    await expect(page.getByRole('heading', { name: 'Not rechecked yet' })).toBeVisible();
    await expect(page.getByText('Destination changed since approval')).toHaveCount(0);
  });

  test('testnet indicator is present', async ({ page }) => {
    await page.goto('/?mock=1', { waitUntil: 'networkidle' });
    await expect(page.getByText('Beldex Testnet').first()).toBeVisible();
  });
});
