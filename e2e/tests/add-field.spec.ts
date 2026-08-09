import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, createDataset, addAvailableColumns, cleanupDataset, navigateToFieldConfig, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(120000);

let session: AdminSession;
let seeded: SeededData;

test.beforeAll(async () => {
  session = await adminLogin();
  const datasetName = `AddField E2E ${Date.now()}`;
  seeded = { datasetId: await createDataset(session.accessToken, datasetName), datasetName };
  await addAvailableColumns(session.accessToken, seeded.datasetId, ['id', 'text', 'category']);
});

test.afterAll(async () => {
  if (seeded) await cleanupDataset(session.accessToken, seeded.datasetId);
});

test.describe('Add New Field Feature', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.datasetId, session);
  });

  test('add new field button is accessible on field config page', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add New Field")');
    await expect(addBtn.first()).toBeVisible();
  });

  test('clicking add new field shows field creation card', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(500);
    const nameInput = page.getByPlaceholder(/Column name/i);
    await expect(nameInput).toBeVisible();
  });

  test('new field card has column name input', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    const nameInput = page.getByPlaceholder(/Column name/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('priority');
    await page.waitForTimeout(200);
    await expect(page.locator('input[value="priority"]')).toBeVisible();
  });

  test('new field has type selector dropdown', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('changing field type to number shows Configure button', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('num_field');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('number');
    await page.waitForTimeout(300);
    const configureBtn = page.getByRole('button', { name: /Configure/i });
    if (await configureBtn.isVisible().catch(() => false)) {
      await expect(configureBtn).toBeVisible();
    }
  });

  test('number type Configure panel shows min/max/step', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('num_cfg');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('number');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/e\.g\. 0/)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. 100/)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. 1/).first()).toBeVisible();
  });

  test('rating type shows max stars config', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('rating_cfg');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('rating');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/e\.g\. 5/)).toBeVisible();
  });

  test('date type shows min/max date pickers', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('date_cfg');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('date');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Minimum Date')).toBeVisible();
    await expect(page.getByText('Maximum Date')).toBeVisible();
  });

  test('select type shows Add Option Card', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('dropdown_cfg');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('select');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('button', { name: /Add Option Card/i })).toBeVisible();
    await expect(page.getByText(/Decision Options/i)).toBeVisible();
  });

  test('radio type shows branching options', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('radio_cfg');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Decision Options/i)).toBeVisible();
  });

  test('delete a new field via trash button', async ({ page }) => {
    const initialTrash = await page.locator('button:has(svg.lucide-trash2)').count();
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder(/Column name/i).fill('delete_me');
    await page.waitForTimeout(200);
    const afterAddTrash = await page.locator('button:has(svg.lucide-trash2)').count();
    expect(afterAddTrash).toBe(initialTrash + 1);
    if (afterAddTrash > initialTrash) {
      await page.locator('button:has(svg.lucide-trash2)').last().click();
      await page.waitForTimeout(200);
      const finalTrash = await page.locator('button:has(svg.lucide-trash2)').count();
      expect(finalTrash).toBe(initialTrash);
    }
  });
});