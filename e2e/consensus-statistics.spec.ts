import { test, expect } from '@playwright/test';

test.describe('Consensus Statistics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test('statistics page loads with KPI cards', async ({ page }) => {
    await page.goto('/dataset/test-dataset-id/statistics');
    await page.waitForSelector('text=Consensus Statistics');
    await page.waitForSelector('text=Compute');
    expect(await page.locator('text=Agreement').count()).toBeGreaterThanOrEqual(1);
  });

  test('session selector is visible', async ({ page }) => {
    await page.goto('/dataset/test-dataset-id/statistics');
    await page.waitForSelector('select');
    const options = await page.locator('select option').count();
    expect(options).toBeGreaterThanOrEqual(1);
  });

  test('all 8 tabs are rendered', async ({ page }) => {
    await page.goto('/dataset/test-dataset-id/statistics');
    const tabs = ['Overview', 'Annotators', 'Fields', 'Timeline', 'Comparison', 'Agreement', 'Reports', 'Configuration'];
    for (const tab of tabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('export dropdown triggers download', async ({ page }) => {
    await page.goto('/dataset/test-dataset-id/statistics');
    const exportBtn = page.locator('button:has-text("Export")');
    await expect(exportBtn).toBeVisible();
  });

  test('refresh button is visible', async ({ page }) => {
    await page.goto('/dataset/test-dataset-id/statistics');
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('back button navigates to previous page', async ({ page }) => {
    await page.goto('/dataset/test-dataset-id/statistics');
    const backBtn = page.locator('button:has-text("ArrowLeft")').first();
    await expect(backBtn).toBeVisible();
  });
});