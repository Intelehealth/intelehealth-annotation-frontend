import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, createDataset, cleanupDataset, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(120000);

let session: AdminSession;
let seeded: SeededData;

test.beforeAll(async () => {
  session = await adminLogin();
  const datasetName = `Annotation E2E ${Date.now()}`;
  seeded = { datasetId: await createDataset(session.accessToken, datasetName), datasetName };
});

test.afterAll(async () => {
  if (seeded) await cleanupDataset(session.accessToken, seeded.datasetId);
});

test.describe('Annotation Workbench Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, `/dataset/${seeded.datasetId}`, session);
  });

  test('dataset detail page loads for authenticated admin', async ({ page }) => {
    expect(page.url()).toContain(`/dataset/${seeded.datasetId}`);
  });

  test('data overview section is accessible', async ({ page }) => {
    await expect(page.getByText('Data Overview').first()).toBeVisible();
  });

  test('upload section is accessible', async ({ page }) => {
    await expect(page.getByText('Upload').first()).toBeVisible();
  });

  test('field configuration tab is accessible', async ({ page }) => {
    await expect(page.getByText('Field Configuration').first()).toBeVisible();
  });

  test('settings tab is accessible', async ({ page }) => {
    await expect(page.getByText('Settings').first()).toBeVisible();
  });

  test('dataset detail page shows sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
  });

  test('admin can access Data Overview tab', async ({ page }) => {
    await page.getByText('Data Overview').first().click();
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('tab=overview');
  });
});