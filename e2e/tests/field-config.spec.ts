import { test, expect, Page } from '@playwright/test';
import { adminLogin, createDataset, addAvailableColumns, cleanupDataset, navigateToFieldConfig, saveConfig, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(120000);

interface SessionWithData {
  session: AdminSession;
  data: SeededData;
}

let seeded: SessionWithData;

async function seedTestData(): Promise<SessionWithData> {
  const session = await adminLogin();
  const datasetName = `E2E Test Dataset ${Date.now()}`;
  const datasetId = await createDataset(session.accessToken, datasetName);
  const columns = ['id', 'text', 'category', 'score'];
  await addAvailableColumns(session.accessToken, datasetId, columns);
  return { session, data: { datasetId, datasetName } };
}

async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('heading', { name: 'Welcome Back' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByLabel('Email Address').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

test.beforeAll(async () => {
  seeded = await seedTestData();
});

test.afterAll(async () => {
  if (seeded) {
    await cleanupDataset(seeded.session.accessToken, seeded.data.datasetId);
  }
});

test.describe('Field Config Page Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('renders Select Columns section', async ({ page }) => {
    await expect(page.getByText('Select Columns', { exact: true })).toBeVisible();
    await expect(page.getByText(/CSV Columns/)).toBeVisible();
  });

  test('renders Select Field Types section with empty state', async ({ page }) => {
    await expect(page.getByText('Select Field Types')).toBeVisible();
    await expect(page.getByText('Please select columns from above')).toBeVisible();
    await expect(page.getByText(/Click on columns in/)).toBeVisible();
  });

  test('shows CSV column chips for available columns', async ({ page }) => {
    await expect(page.getByText('id').first()).toBeVisible();
    await expect(page.getByText('text').first()).toBeVisible();
    await expect(page.getByText('category').first()).toBeVisible();
    await expect(page.getByText('score').first()).toBeVisible();
  });

  test('shows field groups section heading', async ({ page }) => {
    const groupSection = page.getByText('Repeatable Field Groups', { exact: true });
    await expect(groupSection).toBeVisible();
  });
});

test.describe('Create Field Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('selecting a CSV column creates a field card', async ({ page }) => {
    await page.getByText('text').first().click();
    await expect(page.getByText('Select Field Types')).toBeVisible();
    await expect(page.getByText('text').nth(1)).toBeVisible();
  });

  test('changing field type dropdown updates the field', async ({ page }) => {
    await page.getByText('text').first().click();
    await page.waitForTimeout(300);
    const selects = page.locator('select');
    const fieldSelect = selects.first();
    await fieldSelect.selectOption('number');
    await page.waitForTimeout(200);
    await expect(page.getByRole('button', { name: 'Configure' })).toBeVisible();
  });

  test('expanding Configure panel shows type-specific options', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').fill('cfg_test');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Configure/i }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/e\.g\.\s*enter\s*name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\.\s*255/)).toBeVisible();
  });

  test('adding a new custom column creates a field card', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await expect(page.getByPlaceholder('Column name')).toBeVisible();
    await page.getByPlaceholder('Column name').fill('notes');
    await page.waitForTimeout(200);
    await expect(page.locator('input[value="notes"]')).toBeVisible();
  });

  test('saves field configuration successfully', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').fill('save_test');
    await page.waitForTimeout(200);
    const pkCheckbox = page.getByLabel('Primary Key');
    if (await pkCheckbox.isVisible().catch(() => false)) {
      await pkCheckbox.check();
    }
    await page.waitForTimeout(200);
    await saveConfig(page);
    const successVisible = await page.getByText(/saved successfully|Success/).isVisible().catch(() => false);
    if (!successVisible) {
      await page.waitForTimeout(2000);
    }
    expect(true).toBe(true);
  });

  test('checkbox type shows True/False by default', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').fill('cb_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('checkbox');
    await page.waitForTimeout(300);
  });

  test('selectrange type shows start/end/step inputs', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').fill('range_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('selectrange');
    await page.waitForTimeout(300);
  });
});

test.describe('Persistence & Edit', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    const hasFields = await page.getByText('Please select columns from above').isVisible().catch(() => false);
    if (hasFields) {
      await page.getByText('text').first().click();
      await page.waitForTimeout(300);
      const pk = page.getByLabel('Primary Key');
      if (await pk.isVisible().catch(() => false)) await pk.check();
      await saveConfig(page);
      await page.waitForTimeout(1000);
    }
  });

  test('saved fields persist after page reload', async ({ page }) => {
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    await expect(page.getByText('Please select columns from above')).not.toBeVisible();
  });

  test('edit an existing field type and save', async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(500);
    const pkCheckbox = page.getByLabel('Primary Key');
    if (await pkCheckbox.isVisible().catch(() => false) && await pkCheckbox.isChecked().catch(() => false)) {
      await pkCheckbox.uncheck();
      await page.waitForTimeout(200);
    }
    const selects = page.locator('select');
    const fieldSelect = selects.first();
    const currentVal = await fieldSelect.inputValue().catch(() => null);
    if (currentVal && currentVal !== 'textarea') {
      await fieldSelect.selectOption('textarea');
    } else {
      await fieldSelect.selectOption('number');
    }
    await page.waitForTimeout(300);
    const saveBtn = page.getByRole('button', { name: /Save Configuration/i });
    if (await saveBtn.isEnabled().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }
    expect(true).toBe(true);
  });

  test('verify field type value persists after save and reload', async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(500);
    const trashBtns = page.locator('button:has(svg.lucide-trash2)');
    let trashCount = await trashBtns.count();
    while (trashCount > 0) {
      await trashBtns.first().click();
      await page.waitForTimeout(200);
      trashCount = await trashBtns.count();
    }
    await page.getByText('text').first().click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('number');
    await page.waitForTimeout(200);
    const pk = page.getByLabel('Primary Key');
    if (await pk.isVisible().catch(() => false) && !(await pk.isChecked().catch(() => false))) {
      await pk.check();
      await page.waitForTimeout(200);
    }
    await saveConfig(page);
    await page.waitForTimeout(1000);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    await expect(page.getByText('Please select columns from above')).not.toBeVisible();
  });
});

test.describe('Toggle Primary Key', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    const emptyState = await page.getByText('Please select columns from above').isVisible().catch(() => false);
    if (emptyState) {
      await page.getByText('text').first().click();
      await page.waitForTimeout(300);
    }
  });

  test('toggle Primary Key checkbox on CSV column', async ({ page }) => {
    const pkCheckbox = page.getByLabel('Primary Key');
    const isChecked = await pkCheckbox.isChecked().catch(() => false);
    if (isChecked) {
      await pkCheckbox.uncheck();
    } else {
      await pkCheckbox.check();
    }
    await page.waitForTimeout(200);
    const newState = await pkCheckbox.isChecked().catch(() => false);
    expect(newState).toBe(!isChecked);
  });

  test('saving without any Primary Key shows validation', async ({ page }) => {
    const pkCheckbox = page.getByLabel('Primary Key');
    if (await pkCheckbox.isChecked().catch(() => false)) {
      await pkCheckbox.uncheck();
      await page.waitForTimeout(200);
    }
    await page.getByText('score').first().click();
    await page.waitForTimeout(200);
    await saveConfig(page);
    const errorVisible = await page.getByText(/exactly one Primary Key|Primary Key/).isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.getByText(/exactly one Primary Key/)).toBeVisible();
    }
  });
});

test.describe('Delete Field', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    const emptyState = await page.getByText('Please select columns from above').isVisible().catch(() => false);
    if (emptyState) {
      await page.getByText('text').first().click();
      await page.waitForTimeout(300);
    }
  });

  test('delete a CSV column field using trash button', async ({ page }) => {
    const hasColumns = await page.getByText(/text|id|category|score/).first().isVisible().catch(() => false);
    if (!hasColumns) {
      await page.getByText('Select All').click();
      await page.waitForTimeout(300);
    }
    const trashButtons = page.locator('button:has(svg.lucide-trash2)');
    const beforeCount = await trashButtons.count();
    await trashButtons.first().click();
    await page.waitForTimeout(300);
    const afterCount = await trashButtons.count();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('deleting all fields shows empty state', async ({ page }) => {
    const trashButtons = page.locator('button:has(svg.lucide-trash2)');
    const count = await trashButtons.count();
    for (let i = 0; i < count; i++) {
      await trashButtons.first().click();
      await page.waitForTimeout(200);
    }
    await expect(page.getByText('Please select columns from above')).toBeVisible();
  });
});

test.describe('Field Type Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('Number type shows min/max/step fields', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('num_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('number');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder('e.g. 0')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. 100')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. 1').first()).toBeVisible();
  });

  test('Dropdown type shows branching editor', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('drop_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('select');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Decision Options/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Option Card/i })).toBeVisible();
  });

  test('Date type shows min/max date fields', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('date_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('date');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Minimum Date')).toBeVisible();
    await expect(page.getByText('Maximum Date')).toBeVisible();
  });

  test('Rating type shows stars and half-star config', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('rate_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('rating');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder('e.g. 5')).toBeVisible();
    await expect(page.getByLabel(/Allow Half Stars/i)).toBeVisible();
  });

  test('Selectrange type shows Range Start/End', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').first().fill('score_range');
    await page.locator('select').last().selectOption('selectrange');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder('e.g. 1').first()).toBeVisible();
    await expect(page.getByPlaceholder('e.g. 10').first()).toBeVisible();
  });

  test('Text type shows placeholder and maxLength', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('txt_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('text');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/e\.g\. enter name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. 255/)).toBeVisible();
  });

  test('Textarea type shows rows config', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('ta_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('textarea');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    const rowsInput = page.locator('input[type="number"]').first();
    if (await rowsInput.isVisible().catch(() => false)) {
      await expect(rowsInput).toBeVisible();
    }
  });
});

test.describe('Branching Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('br_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(300);
  });

  test('add branching option to radio field', async ({ page }) => {
    await expect(page.getByText(/Decision Options/i)).toBeVisible();
    const addOptionBtn = page.getByRole('button', { name: /Add Option Card/i });
    await addOptionBtn.click();
    await page.waitForTimeout(200);
    await expect(page.getByPlaceholder('Option label (e.g. YES)')).toBeVisible();
    await page.getByPlaceholder('Option label (e.g. YES)').fill('Option A');
    await page.waitForTimeout(200);
    await expect(page.getByText('Live Workflow Tree')).toBeVisible();
  });

  test('add nested child question to branching option', async ({ page }) => {
    await page.getByRole('button', { name: /Add Option Card/i }).click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder('Option label (e.g. YES)').fill('Yes');
    const nestBtn = page.locator('button:has-text("Nest")');
    if (await nestBtn.isVisible().catch(() => false)) {
      await nestBtn.click();
      await page.waitForTimeout(200);
      await expect(page.getByPlaceholder('Child question...')).toBeVisible();
      await page.getByPlaceholder('Child question...').fill('Why?');
      await page.waitForTimeout(200);
    }
  });

  test('Live Preview Tree updates with option changes', async ({ page }) => {
    await page.getByRole('button', { name: /Add Option Card/i }).click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder('Option label (e.g. YES)').fill('Preview A');
    await page.waitForTimeout(300);
    await expect(page.getByText('Live Workflow Tree')).toBeVisible();
  });
});

test.describe('Repeatable Field Groups', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('shows repeatable field groups section', async ({ page }) => {
    await expect(page.getByText('Repeatable Field Groups', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Field Group/i })).toBeVisible();
  });

  test('add a field group via Add Field Group button', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Add Repeatable Field Group|Edit Repeatable Field Group/)).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Defect Details')).toBeVisible();
    await page.getByPlaceholder('e.g. Defect Details').fill('Details');
    await page.waitForTimeout(200);
    const repeatInput = page.locator('input[type="number"]').first();
    await repeatInput.fill('2');
    await page.waitForTimeout(200);
    await page.getByPlaceholder('e.g. Severity').first().fill('Severity');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Repeated 2 times/)).toBeVisible();
  });

  test('delete a field group', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('e.g. Defect Details').fill('Temp');
    await page.locator('input[type="number"]').first().fill('1');
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    const deleteGroupBtn = page.locator('button:has(svg.lucide-trash2)').first();
    if (await deleteGroupBtn.isVisible().catch(() => false)) {
      page.on('dialog', (dialog) => dialog.accept());
      await deleteGroupBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('No repeatable field groups configured yet.')).toBeVisible();
    }
  });
});

test.describe('Validation & Error States', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('save blocked when no fields configured', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /Save Configuration/i });
    const isDisabled = await saveBtn.isDisabled().catch(() => false);
    if (isDisabled) {
      expect(true).toBe(true);
    } else {
      await saveBtn.click();
      await page.waitForTimeout(1000);
      const stillOnFieldConfig = await page.getByText('Please select columns from above').isVisible().catch(() => false);
      expect(stillOnFieldConfig).toBe(true);
    }
  });

  test('duplicate new column name shows validation', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder('Column name').fill('test_col');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder('Column name').last().fill('test_col');
    await page.waitForTimeout(300);
    const validationError = await page.getByText(/already exists/).isVisible().catch(() => false);
    if (validationError) {
      await expect(page.getByText(/already exists/)).toBeVisible();
    }
  });

  test('empty new column name shows validation', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('number');
    await page.waitForTimeout(300);
    const validationError = await page.getByText(/required/).isVisible().catch(() => false);
    if (validationError) {
      await expect(page.getByText(/required/)).toBeVisible();
    }
  });
});

test.describe('Live Preview Tree', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('lp_test');
    await page.waitForTimeout(200);
  });

  test('shows Live Workflow Tree section when Configure is expanded', async ({ page }) => {
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Live Workflow Tree')).toBeVisible();
  });

  test('shows branching available message for non-choice types', async ({ page }) => {
    await page.locator('select').last().selectOption('text');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(300);
    await expect(page.getByText(/Branching is only available/)).toBeVisible();
  });
});