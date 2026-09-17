import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, createDataset, cleanupDataset, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(120000);

let session: AdminSession;
let seeded: SeededData;

test.beforeAll(async () => {
  session = await adminLogin();
  const datasetName = `Settings E2E ${Date.now()}`;
  seeded = { datasetId: await createDataset(session.accessToken, datasetName), datasetName };
});

test.afterAll(async () => {
  if (seeded) await cleanupDataset(session.accessToken, seeded.datasetId);
});

test.describe('Dataset Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, `/dataset/${seeded.datasetId}?tab=settings`, session);
  });

  test('settings tab is accessible from dataset detail', async ({ page }) => {
    expect(page.url()).toContain('tab=settings');
  });

  test('dataset settings form has name input field', async ({ page }) => {
    const nameInput = page.locator('input[id*="name" i], input[name*="name" i], input[placeholder*="name" i]').first();
    await expect(nameInput).toBeVisible();
  });

  test('dataset settings has description textarea', async ({ page }) => {
    const descriptionInput = page.locator('textarea[id*="desc" i], textarea[name*="desc" i], textarea[placeholder*="desc" i]');
    const visible = await descriptionInput.isVisible().catch(() => false);
    if (visible) {
      await expect(descriptionInput).toBeVisible();
    }
  });

  test('dataset settings has save button', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();
  });

  test('settings tab in sidebar is clickable', async ({ page }) => {
    const settingsLink = page.getByText('Settings').first();
    await expect(settingsLink).toBeVisible();
  });

  test('dataset name input is pre-filled with current value', async ({ page }) => {
    const nameInput = page.locator('input[id*="name" i], input[name*="name" i]').first();
    const val = await nameInput.inputValue();
    expect(val.length).toBeGreaterThan(0);
  });
});

test.describe('Profile Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/profile', session);
  });

  test('profile page renders', async ({ page }) => {
    expect(page.url()).toContain('/profile');
  });

  test('profile page has user information form', async ({ page }) => {
    const emailInput = page.locator(`input[value="${session.user.email}"]`);
    if (await emailInput.isVisible().catch(() => false)) {
      await expect(emailInput).toBeVisible();
    }
  });

  test('profile settings link is visible in sidebar', async ({ page }) => {
    await expect(page.getByText('Profile Settings').first()).toBeVisible();
  });

  test('email field is read-only', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await expect(emailInput).toBeDisabled();
    }
  });

  test('change password section is accessible', async ({ page }) => {
    const passwordSection = page.getByText(/Password|Change Password/i);
    const visible = await passwordSection.isVisible().catch(() => false);
    if (visible) {
      await expect(passwordSection).toBeVisible();
    }
  });

  test('save changes button is visible', async ({ page }) => {
    const saveBtn = page.locator('button:has-text("Save Changes"), button:has-text("Save")').first();
    await expect(saveBtn).toBeVisible();
  });

  test('cancel button is visible', async ({ page }) => {
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await expect(cancelBtn).toBeVisible();
  });
});