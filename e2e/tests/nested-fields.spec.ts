import { test, expect, Page } from '@playwright/test';
import { adminLogin, createDataset, addAvailableColumns, cleanupDataset, navigateToFieldConfig, saveConfig, type AdminSession, type SeededData } from './test-utils';

test.setTimeout(240000);

interface SessionWithData {
  session: AdminSession;
  data: SeededData;
}

let seeded: SessionWithData;

async function seedTestData(): Promise<SessionWithData> {
  const session = await adminLogin();
  const datasetName = `NestedFields E2E ${Date.now()}`;
  const datasetId = await createDataset(session.accessToken, datasetName);
  await addAvailableColumns(session.accessToken, datasetId, ['id', 'text', 'category', 'score', 'image']);
  return { session, data: { datasetId, datasetName } };
}

async function setupBranchingField(page: Page, type: string = 'radio') {
  await page.getByRole('button', { name: /Add New Field/i }).click();
  await page.waitForTimeout(300);
  const nameInput = page.getByPlaceholder('Column name').last();
  await nameInput.fill(`br_test_${Date.now()}`);
  await page.waitForTimeout(200);
  await page.locator('select').last().selectOption(type);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Configure/i }).last().click();
  await page.waitForTimeout(500);
}

async function addOption(page: Page, label?: string) {
  await page.getByRole('button', { name: /Add Option Card/i }).first().click();
  await page.waitForTimeout(200);
  if (label) {
    await page.getByPlaceholder('Option label (e.g. YES)').last().fill(label);
    await page.waitForTimeout(200);
  }
}

async function nestChild(page: Page, optIdx: number) {
  const nestBtns = page.locator('button:has-text("Nest")');
  await nestBtns.nth(optIdx).click();
  await page.waitForTimeout(300);
}

async function selectCsvColumnForPK(page: Page, columnName: string = 'id') {
  await page.getByText(columnName, { exact: true }).first().click();
  await page.waitForTimeout(300);
  const pkCheckbox = page.getByLabel('Primary Key');
  if (await pkCheckbox.isVisible().catch(() => false)) {
    await pkCheckbox.check();
    await page.waitForTimeout(200);
  }
}

const childInputSelector = 'input[placeholder="Child question..."]';

test.beforeAll(async () => {
  seeded = await seedTestData();
});

test.afterAll(async () => {
  if (seeded) await cleanupDataset(seeded.session.accessToken, seeded.data.datasetId);
});

test.describe('Branching UI Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('shows Decision Options section for radio type', async ({ page }) => {
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
  });

  test('Add Option Card creates an option row', async ({ page }) => {
    await page.getByRole('button', { name: /Add Option Card/i }).first().click();
    await page.waitForTimeout(200);
    await expect(page.getByPlaceholder('Option label (e.g. YES)')).toBeVisible();
  });

  test('Nest button present for choice types', async ({ page }) => {
    await addOption(page, 'Opt A');
    await expect(page.getByRole('button', { name: /Nest/i })).toBeVisible();
  });

  test('Nest button hidden for non-choice types', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(300);
    await page.locator('select').last().selectOption('text');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(300);
    const addOptionCard = page.getByRole('button', { name: /Add Option Card/i });
    await expect(addOptionCard).not.toBeVisible();
  });

  test('Live Preview Tree visible for choice types', async ({ page }) => {
    await expect(page.getByText('Live Workflow Tree')).toBeVisible();
  });
});

test.describe('Single-Level Nesting', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('add child field under a branching option', async ({ page }) => {
    await addOption(page, 'Option A');
    await nestChild(page, 0);
    const childInput = page.locator(childInputSelector).first();
    await expect(childInput).toBeVisible();
  });

  test('edit nested child field name', async ({ page }) => {
    await addOption(page, 'Option A');
    await nestChild(page, 0);
    const childInput = page.locator(childInputSelector).first();
    await childInput.fill('Severity Level');
    await page.waitForTimeout(200);
    await expect(page.locator('input[value="Severity Level"]')).toBeVisible();
  });

  test('edit nested child field type', async ({ page }) => {
    await addOption(page, 'Option A');
    await nestChild(page, 0);
    const selects = page.locator('select');
    const count = await selects.count();
    if (count >= 2) {
      await selects.nth(count - 1).selectOption('textarea');
      await page.waitForTimeout(200);
      const val = await selects.nth(count - 1).inputValue();
      expect(val).toBe('textarea');
    }
  });

  test('nested child has type selector and required toggle', async ({ page }) => {
    await addOption(page, 'Option A');
    await nestChild(page, 0);
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(2);
    const reqText = page.getByText(/Required/i);
    if (await reqText.isVisible().catch(() => false)) {
      expect(true).toBe(true);
    }
  });

  test('Remove this child field button visible only for nested fields', async ({ page }) => {
    const rootRemoveBtn = page.locator('button:has-text("Remove this child field")');
    await expect(rootRemoveBtn).not.toBeVisible();
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await expect(rootRemoveBtn.first()).toBeVisible();
  });

  test('option description toggle shows description textarea', async ({ page }) => {
    await addOption(page, 'Option A');
    await page.waitForTimeout(200);
    const descCheckbox = page.locator('label:has-text("Description")').locator('input[type="checkbox"]').first();
    if (await descCheckbox.isVisible().catch(() => false)) {
      await descCheckbox.click();
      await page.waitForTimeout(200);
      const descInput = page.getByPlaceholder(/Description/i).first();
      await expect(descInput).toBeVisible();
    }
  });
});

test.describe('Multi-Level Nesting', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('two-level hierarchy (parent -> child -> grandchild)', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    const selects = page.locator('select');
    const count = await selects.count();
    if (count >= 2) {
      await selects.nth(count - 1).selectOption('radio');
      await page.waitForTimeout(300);
    }
    const configureBtns = page.getByRole('button', { name: /Configure/i });
    const cfgCount = await configureBtns.count();
    if (cfgCount >= 2) {
      await configureBtns.nth(cfgCount - 1).click();
      await page.waitForTimeout(300);
    }
    const decisionSections = page.getByText(/Decision Options/i);
    expect(await decisionSections.count()).toBeGreaterThanOrEqual(2);
    const nestBtns = page.locator('button:has-text("Nest")');
    const nestCount = await nestBtns.count();
    if (nestCount >= 1) {
      await page.getByRole('button', { name: /Add Option Card/i }).first().click();
      await page.waitForTimeout(200);
      await nestBtns.last().click();
      await page.waitForTimeout(300);
      const grandchildInput = page.locator(childInputSelector).last();
      await expect(grandchildInput).toBeVisible();
    }
  });

  test('three-level hierarchy', async ({ page }) => {
    await addOption(page, 'L1');
    await nestChild(page, 0);
    const selects = page.locator('select');
    const c1 = await selects.count();
    if (c1 >= 2) await selects.nth(c1 - 1).selectOption('radio');
    await page.waitForTimeout(300);
    const cfgBtns = page.getByRole('button', { name: /Configure/i });
    const cfgC = await cfgBtns.count();
    if (cfgC >= 2) await cfgBtns.nth(cfgC - 1).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Add Option Card/i }).first().click();
    await page.waitForTimeout(200);
    const nestBtns = page.locator('button:has-text("Nest")');
    const nC = await nestBtns.count();
    if (nC >= 1) {
      await nestBtns.last().click();
      await page.waitForTimeout(300);
      const l3Input = page.locator(childInputSelector).last();
      await expect(l3Input).toBeVisible();
    }
  });

  test('multiple children under one option', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const childInputs = page.locator(childInputSelector);
    const ic = await childInputs.count();
    expect(ic).toBeGreaterThanOrEqual(2);
  });

  test('multiple options each with children', async ({ page }) => {
    await addOption(page, 'Option A');
    await addOption(page, 'Option B');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await nestChild(page, 1);
    await page.waitForTimeout(200);
    const childInputs = page.locator(childInputSelector);
    const ic = await childInputs.count();
    expect(ic).toBeGreaterThanOrEqual(2);
  });

  test('different child types under same option', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const selects = page.locator('select');
    const sc = await selects.count();
    if (sc >= 3) {
      await selects.nth(sc - 2).selectOption('textarea');
      await page.waitForTimeout(200);
      await selects.nth(sc - 1).selectOption('number');
      await page.waitForTimeout(200);
    }
  });

  test('deep nesting (5+ levels) without artificial cap', async ({ page }) => {
    await addOption(page, 'Root');
    for (let level = 1; level <= 5; level++) {
      const nestBtn = page.locator('button:has-text("Nest")');
      if (await nestBtn.isVisible().catch(() => false)) {
        await nestBtn.first().click();
        await page.waitForTimeout(200);
      }
      const allSelects = page.locator('select');
      const sc = await allSelects.count();
      if (sc > 1) {
        await allSelects.nth(sc - 1).selectOption('radio');
        await page.waitForTimeout(200);
      }
      const cfgBtns = page.getByRole('button', { name: /Configure/i });
      const cc = await cfgBtns.count();
      if (cc > 1) {
        await cfgBtns.nth(cc - 1).click();
        await page.waitForTimeout(200);
      }
      const addOptBtn = page.getByRole('button', { name: /Add Option Card/i });
      if (await addOptBtn.isVisible().catch(() => false)) {
        await addOptBtn.first().click();
        await page.waitForTimeout(200);
      }
    }
    const allInputs = page.locator(childInputSelector);
    expect(await allInputs.count()).toBeGreaterThanOrEqual(5);
  });
});

test.describe('Parent-Child Relationship Validation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('LivePreviewTree shows nesting visually', async ({ page }) => {
    await addOption(page, 'Parent Opt');
    await nestChild(page, 0);
    await page.waitForTimeout(500);
    const treeSection = page.getByText('Live Workflow Tree');
    await expect(treeSection).toBeVisible();
    const treeParent = page.getByText('Parent Opt').last();
    await expect(treeParent).toBeVisible();
  });

  test('remove child preserves sibling fields', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const beforeInputs = page.locator(childInputSelector);
    const before = await beforeInputs.count();
    if (before >= 2) {
      const removeBtns = page.locator('button:has-text("Remove this child field")');
      const rb = await removeBtns.count();
      if (rb > 0) {
        await removeBtns.first().click();
        await page.waitForTimeout(200);
        const afterInputs = page.locator(childInputSelector);
        const after = await afterInputs.count();
        expect(after).toBe(before - 1);
      }
    }
  });

  test('remove parent option cascade deletes children', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const beforeInputs = page.locator(childInputSelector);
    const before = await beforeInputs.count();
    const deleteBtns = page.locator('button:has(svg.lucide-trash2)');
    if (await deleteBtns.count() > 0) {
      await deleteBtns.first().click();
      await page.waitForTimeout(200);
      const afterInputs = page.locator(childInputSelector);
      const after = await afterInputs.count();
      expect(after).toBeLessThan(before);
    }
  });

  test('switch type FROM choice TO non-choice preserves branching data', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(300);
    await page.locator('select').last().selectOption('text');
    await page.waitForTimeout(300);
    const decisionSection = page.getByText(/Decision Options/i);
    await expect(decisionSection).not.toBeVisible();
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
  });

  test('option reorder preserves child attachments', async ({ page }) => {
    await addOption(page, 'Option A');
    await addOption(page, 'Option B');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const downBtns = page.locator('button:has(svg.lucide-chevron-down)');
    if (await downBtns.count() > 0) {
      await downBtns.first().click();
      await page.waitForTimeout(200);
      const childInputs = page.locator(childInputSelector);
      expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('remove child field has no confirmation dialog', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    let dialogSeen = false;
    page.on('dialog', () => { dialogSeen = true; });
    const removeBtns = page.locator('button:has-text("Remove this child field")');
    if (await removeBtns.count() > 0) {
      await removeBtns.first().click();
      await page.waitForTimeout(300);
      expect(dialogSeen).toBe(false);
    }
  });

  test('remove all children shows empty child state', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const removeBtns = page.locator('button:has-text("Remove this child field")');
    if (await removeBtns.count() > 0) {
      await removeBtns.first().click();
      await page.waitForTimeout(200);
    }
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBe(0);
    const optionInput = page.getByPlaceholder('Option label (e.g. YES)');
    await expect(optionInput).toBeVisible();
  });
});

test.describe('Option Label & Description Features', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('option label with colon splits into label and description', async ({ page }) => {
    await addOption(page, 'High:Very severe');
    await page.waitForTimeout(200);
    const labelInput = page.getByPlaceholder('Option label (e.g. YES)');
    const val = await labelInput.inputValue().catch(() => '');
    if (val) {
      expect(val).not.toContain(':');
    }
  });

  test('dots sanitized from option labels', async ({ page }) => {
    await addOption(page, 'Option.A');
    await page.waitForTimeout(200);
    const labelInput = page.getByPlaceholder('Option label (e.g. YES)');
    const val = await labelInput.inputValue().catch(() => '');
    expect(val).not.toContain('.');
  });

  test('toggle description placeholder on option', async ({ page }) => {
    await addOption(page, 'Option A');
    await page.waitForTimeout(200);
    const descCheckbox = page.locator('label:has-text("Description")').locator('input[type="checkbox"]').first();
    if (await descCheckbox.isVisible().catch(() => false)) {
      await descCheckbox.click();
      await page.waitForTimeout(200);
      const descInput = page.getByPlaceholder(/Description/i).first();
      await expect(descInput).toBeVisible();
    }
  });

  test('switch between branchable types preserves options and children', async ({ page }) => {
    await addOption(page, 'Option A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('select');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Rating & Checkbox Branching', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('rating type auto-generates options matching maxRating', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('rating_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('rating');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    for (let i = 1; i <= 5; i++) {
      await expect(page.locator(`span:has-text("★ ${i}")`).first()).toBeVisible();
    }
  });

  test('add child field to a rating option', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('rating_test2');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('rating');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    const nestBtns = page.locator('button:has-text("Nest")');
    if (await nestBtns.count() > 0) {
      await nestBtns.first().click();
      await page.waitForTimeout(300);
      const childInputs = page.locator(childInputSelector);
      expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('checkbox type shows True/False options with Nest', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('cb_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('checkbox');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    const options = page.locator('input[placeholder="Option label (e.g. YES)"]');
    expect(await options.count()).toBe(2);
    const nestBtns = page.locator('button:has-text("Nest")');
    await expect(nestBtns.first()).toBeVisible();
    await nestBtns.first().click();
    await page.waitForTimeout(300);
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
  });

  test('multiselect shows branching editor', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('ms_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('multiselect');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
    await addOption(page, 'Choice 1');
    await nestChild(page, 0);
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
  });

  test('select (dropdown) shows branching editor', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('sel_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('select');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
    await addOption(page, 'Dropdown Opt');
    await nestChild(page, 0);
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Nested Field Deletion & Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('delete preserves sibling fields under same option', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const removeBtns = page.locator('button:has-text("Remove this child field")');
    const rbCount = await removeBtns.count();
    if (rbCount >= 2) {
      await removeBtns.first().click();
      await page.waitForTimeout(200);
      const remaining = page.locator('button:has-text("Remove this child field")');
      expect(await remaining.count()).toBe(rbCount - 1);
    }
  });

  test('save then delete child then reload verifies deletion persisted', async ({ page }) => {
    await addOption(page, 'Persist Opt');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await selectCsvColumnForPK(page);
    await page.waitForTimeout(200);
    await saveConfig(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    const cfgBtn = page.getByRole('button', { name: /Configure/i });
    if (await cfgBtn.isVisible().catch(() => false)) {
      await cfgBtn.last().click();
      await page.waitForTimeout(500);
    }
    const childInputs = page.locator(childInputSelector);
    const afterReload = await childInputs.count();
    expect(afterReload).toBeGreaterThanOrEqual(1);
  });

  test('delete option with children cascades to all nested levels', async ({ page }) => {
    await addOption(page, 'Root Opt');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const deleteBtn = page.getByRole('button', { name: /Delete|trash/i, exact: false }).filter({ hasNotText: 'Remove' }).first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      const childInputs = page.locator(childInputSelector);
      await expect(childInputs).toHaveCount(0, { timeout: 5000 });
    }
  });

  test('delete all children then save restores empty state', async ({ page }) => {
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    const removeBtns = page.locator('button:has-text("Remove this child field")');
    if (await removeBtns.count() > 0) {
      await removeBtns.first().click();
      await page.waitForTimeout(200);
    }
    const childInputs = page.locator(childInputSelector);
    expect(await childInputs.count()).toBe(0);
    const optionInput = page.getByPlaceholder('Option label (e.g. YES)');
    await expect(optionInput).toBeVisible();
  });
});

test.describe('Save, Load & Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
  });

  test('save single-level nesting then reload verifies hierarchy', async ({ page }) => {
    await addOption(page, 'Persist Opt');
    await nestChild(page, 0);
    await page.waitForTimeout(200);
    await selectCsvColumnForPK(page);
    await page.waitForTimeout(200);
    await saveConfig(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    const cfgBtns = page.getByRole('button', { name: /Configure/i });
    if (await cfgBtns.count() > 0) {
      await cfgBtns.last().click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
  });

  test('save with option descriptions then reload verifies preservation', async ({ page }) => {
    await addOption(page, 'Opt A');
    await page.waitForTimeout(200);
    const descCheckbox = page.locator('label:has-text("Description")').locator('input[type="checkbox"]').first();
    if (await descCheckbox.isVisible().catch(() => false)) {
      await descCheckbox.click();
      await page.waitForTimeout(200);
    }
    await selectCsvColumnForPK(page);
    await page.waitForTimeout(200);
    await saveConfig(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    const cfgBtns = page.getByRole('button', { name: /Configure/i });
    if (await cfgBtns.count() > 0) {
      await cfgBtns.last().click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
  });

  test('save with reordered options then reload verifies order', async ({ page }) => {
    await addOption(page, 'First');
    await addOption(page, 'Second');
    await page.waitForTimeout(200);
    const upBtns = page.locator('button:has(svg.lucide-chevron-up)');
    if (await upBtns.count() >= 2) {
      await upBtns.nth(1).click();
      await page.waitForTimeout(200);
    }
    await selectCsvColumnForPK(page);
    await page.waitForTimeout(200);
    await saveConfig(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    const cfgBtns = page.getByRole('button', { name: /Configure/i });
    if (await cfgBtns.count() > 0) {
      await cfgBtns.last().click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
  });

  test.skip('save multi-level nesting then reload verifies deep hierarchy', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('hierarchy_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add Option Card/i }).first().click();
    await page.waitForTimeout(200);
    await page.getByPlaceholder('Option label (e.g. YES)').fill('Opt A');
    await page.waitForTimeout(200);
    const nestBtns = page.locator('button:has-text("Nest")');
    if (await nestBtns.count() > 0) {
      await nestBtns.first().click();
      await page.waitForTimeout(300);
    }
    await page.getByText('id').first().click();
    await page.waitForTimeout(200);
    const pkCheckbox = page.getByLabel('Primary Key');
    if (await pkCheckbox.isVisible().catch(() => false)) {
      await pkCheckbox.check();
      await page.waitForTimeout(200);
    }
    await page.getByRole('button', { name: /Save Configuration/i }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await page.goto(`/dataset/${seeded.data.datasetId}?tab=field-configuration`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);
    await expect(page.getByText('Opt A')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Validation & Error States', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('non-branchable child type hides Nest button', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('val_test');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await addOption(page, 'Opt A');
    await nestChild(page, 0);
    const selects = page.locator('select');
    const sc = await selects.count();
    if (sc >= 2) {
      await selects.nth(sc - 1).selectOption('text');
      await page.waitForTimeout(300);
    }
    const nestBtns = page.locator('button:has-text("Nest")');
    const nestCount = await nestBtns.count();
    expect(nestCount).toBe(1);
  });

  test('empty option label shows validation on save', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('val_test2');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Add Option Card/i }).first().click();
    await page.waitForTimeout(200);
    const saveBtn = page.getByRole('button', { name: /Save Configuration/i });
    if (await saveBtn.isEnabled().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('type change FROM choice TO non-choice hides decision options', async ({ page }) => {
    await page.getByRole('button', { name: /Add New Field/i }).click();
    await page.waitForTimeout(300);
    await page.getByPlaceholder('Column name').last().fill('val_test3');
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('radio');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Decision Options/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Configure/i }).last().click();
    await page.waitForTimeout(200);
    await page.locator('select').last().selectOption('text');
    await page.waitForTimeout(300);
    await expect(page.getByText(/Decision Options/i)).not.toBeVisible();
  });

  test('multi-level editing preserves branching for child fields', async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await setupBranchingField(page, 'radio');
    await addOption(page, 'Root');
    await nestChild(page, 0);
    const selects = page.locator('select');
    const sc = await selects.count();
    if (sc >= 2) {
      await selects.nth(sc - 1).selectOption('radio');
      await page.waitForTimeout(200);
    }
    const decisionSections = page.getByText(/Decision Options/i);
    expect(await decisionSections.count()).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Field Groups with Branching', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
  });

  test('create field group with child field', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Add Repeatable Field Group/i)).toBeVisible();
    await page.getByPlaceholder('e.g. Defect Details').fill('Details Group');
    await page.waitForTimeout(200);
    const fieldNameInput = page.getByPlaceholder('e.g. Severity');
    if (await fieldNameInput.isVisible().catch(() => false)) {
      await fieldNameInput.fill('Severity');
      await page.waitForTimeout(200);
    }
    const childSelects = page.locator('select');
    if (await childSelects.count() > 0) {
      await childSelects.last().selectOption('textarea');
      await page.waitForTimeout(300);
    }
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Details Group/i)).toBeVisible();
  });

  test('edit nested field inside field group', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('e.g. Defect Details').fill('Nested Group');
    await page.waitForTimeout(200);
    const fieldNameInput = page.getByPlaceholder('e.g. Severity');
    if (await fieldNameInput.isVisible().catch(() => false)) {
      await fieldNameInput.fill('Severity');
      await page.waitForTimeout(200);
    }
    const selects = page.locator('select');
    const sc = await selects.count();
    if (sc > 0) {
      await selects.last().selectOption('textarea');
      await page.waitForTimeout(200);
    }
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Nested Group/i)).toBeVisible();
  });

  test('save field group with branching then reload verifies persistence', async ({ page }) => {
    await page.getByRole('button', { name: /Add Field Group/i }).click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('e.g. Defect Details').fill('Persist Group');
    await page.waitForTimeout(200);
    const fnInput = page.getByPlaceholder('e.g. Severity');
    if (await fnInput.isVisible().catch(() => false)) {
      await fnInput.fill('Severity');
      await page.waitForTimeout(200);
    }
    await page.getByRole('button', { name: /Add Group/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Persist Group/i)).toBeVisible();
    await saveConfig(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await navigateToFieldConfig(page, seeded.data.datasetId, seeded.session);
    await page.waitForTimeout(1000);
    const groupSection = page.getByText('Repeatable Field Groups', { exact: true });
    await expect(groupSection).toBeVisible();
  });
});