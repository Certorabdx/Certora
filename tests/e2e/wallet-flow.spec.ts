/**
 * E2E tests for Certora's core wallet → resolve → pin → change → reapprove flow.
 *
 * These tests use a MOCK wallet provider (enabled via the `?mock=1` query
 * parameter). They are clearly labeled as mocked tests and do NOT establish
 * live testnet operation. They verify the UI wiring and workflow logic only.
 *
 * Test 2 uses a distinct BNS name (`bob.bdx`) so it does not depend on the
 * IndexedDB state left behind by test 1 (IndexedDB persists across tests in
 * the same origin).
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

// Clear IndexedDB before each test so pins don't leak between tests
// (same origin, shared IndexedDB across tests in one browser context).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const req = indexedDB.deleteDatabase('certora');
    req.onsuccess = () => {};
    req.onerror = () => {};
    req.onblocked = () => {};
  });
});

test.describe('Certora mock-wallet flow', () => {
  test('connect, resolve, pin, reload persistence', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });

    // Testnet indicator is present (sidebar badge).
    await expect(page.getByText('Beldex Testnet').first()).toBeVisible();

    // Resolve a BNS name.
    await page.getByPlaceholder('e.g. merchant.bdx').fill('merchant.bdx');
    await page.getByRole('button', { name: /^resolve$/i }).click();
    await page.getByText('BDXRecipientA').waitFor({ state: 'visible' });

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
  });

  test('destination change detection and reapproval', async ({ page }) => {
    await page.goto('/resolve?mock=1', { waitUntil: 'networkidle' });

    // The mock resolves merchant.bdx → recipient A by default. Point it at a
    // distinct name for this test so it does not collide with test 1's pin.
    await page.evaluate(() => {
      const w = (window as unknown as { __mockWallet?: { setResolveResult: (a: string, b: string) => void } }).__mockWallet;
      if (!w) throw new Error('Mock wallet not exposed');
      w.setResolveResult('bob.bdx', 'BDXRecipientA');
    });

    // Resolve and pin recipient A for bob.bdx.
    await page.getByPlaceholder('e.g. merchant.bdx').fill('bob.bdx');
    await page.getByRole('button', { name: /^resolve$/i }).click();
    await page.getByText('BDXRecipientA').waitFor({ state: 'visible' });
    const approveBtn = page.locator('button').filter({ hasText: /pin recipient/i });
    await approveBtn.waitFor({ state: 'visible' });
    await approveBtn.click();
    await page.getByRole('button', { name: /^approve & pin$/i }).click();
    await expect(page.getByText('Recipient pinned')).toBeVisible();
    await page.waitForURL('**/recipients');

    // Simulate an on-chain mapping change performed outside Certora: the
    // owner updates bob.bdx to resolve to recipient B.
    await page.evaluate(() => {
      const w = (window as unknown as { __mockWallet?: { setResolveResult: (a: string, b: string) => void } }).__mockWallet;
      w.setResolveResult('bob.bdx', 'BDXRecipientB');
    });

    // bob.bdx should now be listed as a protected recipient.
    const bobLink = page.getByRole('link', { name: 'bob.bdx' });
    await bobLink.waitFor({ state: 'visible' });
    await bobLink.click();
    await page.getByRole('button', { name: /recheck destination/i }).click();

    await expect(page.getByText('Destination changed since approval')).toBeVisible();
    await expect(page.getByText('BDXRecipientA').first()).toBeVisible();
    await expect(page.getByText('BDXRecipientB').first()).toBeVisible();

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

  test('testnet indicator is present', async ({ page }) => {
    await page.goto('/?mock=1', { waitUntil: 'networkidle' });
    await expect(page.getByText('Beldex Testnet').first()).toBeVisible();
  });
});
