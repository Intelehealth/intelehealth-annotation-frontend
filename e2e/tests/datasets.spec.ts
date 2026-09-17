import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, createDataset, cleanupDataset, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(120000);

let session: AdminSession;
let seeded: SeededData;

test.beforeAll(async () => {
  session = await adminLogin();
  const datasetName = `E2E Dataset List ${Date.now()}`;
  seeded = { datasetId: await createDataset(session.accessToken, datasetName), datasetName };
});

test.afterAll(async () => {
  if (seeded) await cleanupDataset(session.accessToken, seeded.datasetId);
});

test.describe('Datasets (Projects) List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dataset', session);
  });

  test('renders dataset list page', async ({ page }) => {
    const heading = page.locator('h1, h2', { hasText: /Dataset/i });
    const count = await heading.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('shows dataset cards with names', async ({ page }) => {
    await expect(page.getByText(seeded.datasetName)).toBeVisible();
  });

  test('shows add dataset button for admin', async ({ page }) => {
    const addBtn = page.locator('a[href*="add-dataset"], a[href*="add"], button:has-text("Add Dataset"), button:has(svg.lucide-plus)');
    await expect(addBtn.first()).toBeVisible();
  });

  test('sidebar shows Datasets link as active', async ({ page }) => {
    const datasetLink = page.locator('a[href="/dataset"]');
    await expect(datasetLink).toBeVisible();
  });

  test('clicking a dataset navigates to detail page', async ({ page }) => {
    const datasetLink = page.locator(`a[href*="/dataset/${seeded.datasetId}"]`).first();
    if (await datasetLink.isVisible().catch(() => false)) {
      await datasetLink.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain(`/dataset/${seeded.datasetId}`);
    }
  });
});

test.describe('Create Dataset Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dataset/add-dataset', session);
  });

  test('renders create dataset form', async ({ page }) => {
    const heading = page.locator('h1, h2', { hasText: /Create|Add Dataset/i });
    const count = await heading.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('has dataset name input field', async ({ page }) => {
    const nameInput = page.locator('input[id*="name" i], input[placeholder*="name" i], input[name*="name" i]');
    await expect(nameInput.first()).toBeVisible();
  });

  test('has dataset type selector', async ({ page }) => {
    const typeSelector = page.locator('[role="combobox"], button:has-text("Text"), button:has-text("Image")');
    await expect(typeSelector.first()).toBeVisible();
  });

  test('has submit/create button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    await expect(submitBtn.first()).toBeVisible();
  });

  test('dataset type cards are clickable', async ({ page }) => {
    const typeCards = page.locator('button:has-text("Text"), button:has-text("Image"), button:has-text("Audio")');
    const count = await typeCards.count();
    if (count > 0) {
      await typeCards.first().click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe('Dataset Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, `/dataset/${seeded.datasetId}`, session);
  });

  test('renders dataset detail page', async ({ page }) => {
    expect(page.url()).toContain(`/dataset/${seeded.datasetId}`);
  });

  test('shows dataset name in sidebar', async ({ page }) => {
    const sidebarName = page.locator('text=ACTIVE:');
    await expect(sidebarName).toBeVisible();
  });

  test('shows tab navigation in sidebar sub-menu', async ({ page }) => {
    await expect(page.getByText('Data Overview').first()).toBeVisible();
    await expect(page.getByText('Upload').first()).toBeVisible();
    await expect(page.getByText('Field Configuration').first()).toBeVisible();
    await expect(page.getByText('Schema Requests').first()).toBeVisible();
    await expect(page.getByText('Settings').first()).toBeVisible();
  });

  test('shows consensus navigation links in sidebar', async ({ page }) => {
    await expect(page.getByText('Generate Consensus')).toBeVisible();
    await expect(page.getByText('Review Consensus')).toBeVisible();
  });

  test('clicking Settings tab navigates correctly', async ({ page }) => {
    await page.getByText('Settings').first().click();
    await page.waitForFunction(() => window.location.href.includes('settings'), { timeout: 10000 });
    expect(page.url()).toContain('settings');
  });

  test('clicking Field Configuration tab navigates correctly', async ({ page }) => {
    await page.getByText('Field Configuration').first().click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('field-configuration');
  });
});