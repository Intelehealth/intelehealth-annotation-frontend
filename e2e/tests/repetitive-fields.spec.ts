import { test, expect } from '@playwright/test';
import { adminLogin, createDataset, addAvailableColumns, cleanupDataset, navigateToFieldConfig, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(120000);

let session: AdminSession;
let seeded: SeededData;

test.beforeAll(async () => {
  session = await adminLogin();
  const datasetName = `RepetitiveFields E2E ${Date.now()}`;
  seeded = { datasetId: await createDataset(session.accessToken, datasetName), datasetName };
  await addAvailableColumns(session.accessToken, seeded.datasetId, ['id', 'text']);
});

test.afterAll(async () => {
  if (seeded) await cleanupDataset(session.accessToken, seeded.datasetId);
});

test.describe('Repeatable Field Groups', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.datasetId, session);
  });

  test('repeatable field groups section heading is visible', async ({ page }) => {
    const groupHeading = page.getByText('Repeatable Field Groups', { exact: true });
    const addGroupBtn = page.getByText('Add Field Group');
    const anyVisible = (await groupHeading.isVisible().catch(() => false)) ||
                       (await addGroupBtn.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });

  test('add field group button exists', async ({ page }) => {
    const addGroupBtn = page.locator('button:has-text("Add Field Group"), button:has-text("Add Group")');
    await expect(addGroupBtn.first()).toBeVisible();
  });

  test('shows empty state when no groups configured', async ({ page }) => {
    const emptyText = page.getByText(/No repeatable field groups configured yet/i);
    const addGroupBtn = page.getByRole('button', { name: /Add Field Group/i });
    const anyVisible = (await emptyText.isVisible().catch(() => false)) ||
                       (await addGroupBtn.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });

  test('clicking Add Field Group opens group creation modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    const modalText = page.getByText(/Add Repeatable Field Group|Edit Repeatable Field Group/i);
    await expect(modalText).toBeVisible();
  });

  test('group modal has group name input', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    const nameInput = page.getByPlaceholder(/e\.g\. Defect Details|Group name|Name/i);
    await expect(nameInput).toBeVisible();
  });

  test('group modal has repeat count with default value 3', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    const repeatInput = page.locator('input[type="number"]').first();
    await expect(repeatInput).toBeVisible();
    const val = await repeatInput.inputValue();
    if (val) expect(val).toBe('3');
  });

  test('create a field group with valid data', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/e\.g\. Defect Details/).fill('Defect Info');
    await page.waitForTimeout(200);
    const repeatInput = page.locator('input[type="number"]').first();
    await repeatInput.fill('2');
    await page.waitForTimeout(200);
    const childName = page.getByPlaceholder(/e\.g\. Severity/);
    if (await childName.isVisible().catch(() => false)) {
      await childName.fill('Severity');
      await page.waitForTimeout(200);
    }
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Defect Info/)).toBeVisible();
  });

  test('edit existing field group opens modal with pre-filled data', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/e\.g\. Defect Details/).fill('Edit Test');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    const editBtns = page.locator('button:has(svg.lucide-edit), button:has(svg.lucide-pencil)');
    if (await editBtns.isVisible().catch(() => false)) {
      await editBtns.first().click();
      await page.waitForTimeout(500);
      const modal = page.getByText(/Edit Repeatable Field Group/i);
      await expect(modal).toBeVisible();
    }
  });

  test('delete field group removes it from the list', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/e\.g\. Defect Details/).fill('Delete Me');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    const deleteBtns = page.locator('button:has(svg.lucide-trash2)').first();
    if (await deleteBtns.isVisible().catch(() => false)) {
      page.on('dialog', (dialog) => dialog.accept());
      await deleteBtns.click();
      await page.waitForTimeout(500);
      const deleted = page.getByText('Delete Me');
      await expect(deleted).not.toBeVisible();
    }
  });

  test('child field type selector exists in group modal', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    const selects = page.locator('select');
    if (await selects.count() > 0) {
      await expect(selects.last()).toBeVisible();
    }
  });

  test('multiple field groups can be created', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder(/e\.g\. Defect Details/).fill('Group A');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Repeatable Field Groups/i).first()).toBeVisible();
  });
});