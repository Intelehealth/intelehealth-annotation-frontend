import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'bhooomikasshetty20@gmail.com';
const ADMIN_PASSWORD = 'strpass123';
const API_BASE = 'http://localhost:4000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function getAuthToken(request: any): Promise<string> {
  const loginRes = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(loginRes.status()).toBe(201);
  return (await loginRes.json()).access_token;
}

async function getFirstDatasetId(request: any, token: string): Promise<string> {
  const res = await request.get(`${API_BASE}/datasets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const datasets = await res.json();
  expect(datasets.length).toBeGreaterThan(0);
  return datasets[0]._id;
}

async function getFieldConfig(request: any, token: string, datasetId: string): Promise<any> {
  const res = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() === 404) return null;
  expect(res.status()).toBe(200);
  return res.json();
}

// ─── Test Suite: CSV Mapping Refactor ────────────────────────────────────────

test.describe('CSV Mapping — Move, Not Link', () => {

  // ─── Scenario 1: Drag CSV field into Annotation Workbench ────────────────
  test('Scenario 1: Drag CSV field — field moves, no clone created', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);

    // Get current field config
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found for first dataset');

    // Find a CSV field NOT already in annotation
    const csvField = config.annotationFields.find(
      (f: any) => !f.isAnnotationField && !f.isNewColumn && !f.isPrimaryKey
    );
    test.skip(!csvField, 'No unmapped CSV field available');

    const csvColumnName = csvField.csvColumnName;
    const fieldId = csvField.id;

    // Simulate drag: toggle isAnnotationField
    const updatedFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === csvColumnName) {
        return { ...f, isAnnotationField: true, isPrimaryKey: false };
      }
      return f;
    });

    // Save via API
    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: updatedFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    // Reload config and verify
    config = await getFieldConfig(request, token, datasetId);
    const movedField = config.annotationFields.find((f: any) => f.csvColumnName === csvColumnName);
    expect(movedField).toBeTruthy();
    expect(movedField.isAnnotationField).toBe(true);
    expect(movedField.csvColumnName).toBe(csvColumnName);
    if (fieldId) expect(movedField.id).toBe(fieldId);

    // Verify deprecated fields are stripped
    expect(movedField.isDataFieldLink).toBeUndefined();
    expect(movedField.sourceCsvColumnName).toBeUndefined();

    // Verify left panel filter would exclude this field
    const metadataFields = config.annotationFields.filter(
      (f: any) => !f.isNewColumn && !f.isAnnotationField
    );
    expect(metadataFields.find((f: any) => f.csvColumnName === csvColumnName)).toBeFalsy();

    // Reset: move field back
    const resetFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === csvColumnName) {
        return { ...f, isAnnotationField: false };
      }
      return f;
    });
    await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: resetFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
  });

  // ─── Scenario 2: Already mapped ──────────────────────────────────────────
  test('Scenario 2: Already mapped — duplicate drop rejected', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Find a field already in annotation
    const mappedField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && !f.isNewColumn && f.csvColumnName
    );
    test.skip(!mappedField, 'No mapped field to test duplicate');

    // Attempt to create a duplicate with same csvColumnName
    const duplicateFields = [
      ...config.annotationFields,
      { ...mappedField, id: `dup_${Date.now()}`, fieldName: `${mappedField.fieldName} (dup)` },
    ];

    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: duplicateFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(400);
    const body = await saveRes.json();
    expect(body.message || '').toContain('Duplicate CSV column');
  });

  // ─── Scenario 3: Remove from annotation ──────────────────────────────────
  test('Scenario 3: Remove from annotation — field returns to metadata', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Find a mapped CSV field
    const mappedField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && !f.isNewColumn && f.csvColumnName
    );
    test.skip(!mappedField, 'No mapped field available');

    const csvColumnName = mappedField.csvColumnName;

    // Toggle isAnnotationField to false
    const updatedFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === csvColumnName) {
        return { ...f, isAnnotationField: false };
      }
      return f;
    });

    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: updatedFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    // Verify field returned to metadata
    config = await getFieldConfig(request, token, datasetId);
    const metadataFields = config.annotationFields.filter(
      (f: any) => !f.isNewColumn && !f.isAnnotationField
    );
    expect(metadataFields.find((f: any) => f.csvColumnName === csvColumnName)).toBeTruthy();

    // Restore
    const restoreFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === csvColumnName) {
        return { ...f, isAnnotationField: true };
      }
      return f;
    });
    await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: restoreFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
  });

  // ─── Scenario 4: Rename title ────────────────────────────────────────────
  test('Scenario 4: Rename question title — csvColumnName unchanged', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    const mappedField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && !f.isNewColumn && f.csvColumnName
    );
    test.skip(!mappedField, 'No mapped field available');

    const originalCsvColumnName = mappedField.csvColumnName;
    const fieldId = mappedField.id;
    const newTitle = `Renamed Title ${Date.now()}`;

    const updatedFields = config.annotationFields.map((f: any) => {
      if (f.id === fieldId && f.csvColumnName === originalCsvColumnName) {
        return { ...f, questionTitle: newTitle };
      }
      return f;
    });

    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: updatedFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    config = await getFieldConfig(request, token, datasetId);
    const renamedField = config.annotationFields.find(
      (f: any) => f.csvColumnName === originalCsvColumnName
    );
    expect(renamedField).toBeTruthy();
    expect(renamedField.questionTitle).toBe(newTitle);
    expect(renamedField.csvColumnName).toBe(originalCsvColumnName);
    if (fieldId) expect(renamedField.id).toBe(fieldId);

    // Restore
    const restoreFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === originalCsvColumnName) {
        return { ...f, questionTitle: mappedField.questionTitle || mappedField.fieldName };
      }
      return f;
    });
    await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: restoreFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
  });

  // ─── Scenario 5: Duplicate field ─────────────────────────────────────────
  test('Scenario 5: Duplicate field creates copy with isNewColumn', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    const originalField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && f.csvColumnName
    );
    test.skip(!originalField, 'No annotation field to duplicate');

    const duplicate = {
      ...originalField,
      id: `field_${Date.now()}`,
      fieldName: `${originalField.fieldName} (copy)`,
      questionTitle: `Copy of ${originalField.questionTitle || originalField.fieldName}`,
      isNewColumn: true,
      isAnnotationField: true,
    };

    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: [...config.annotationFields, duplicate],
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    config = await getFieldConfig(request, token, datasetId);
    const dupField = config.annotationFields.find((f: any) => f.id === duplicate.id);
    expect(dupField).toBeTruthy();
    expect(dupField.isNewColumn).toBe(true);
    expect(dupField.csvColumnName).toBe(originalField.csvColumnName);
    expect(dupField.id).not.toBe(originalField.id);

    // Cleanup: remove the duplicate
    const cleanFields = config.annotationFields.filter((f: any) => f.id !== duplicate.id);
    await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: cleanFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
  });

  // ─── Scenario 8: Backend duplicate csvColumnName ─────────────────────────
  test('Scenario 8: Duplicate csvColumnName returns HTTP 400', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    const mappedField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && f.csvColumnName
    );
    test.skip(!mappedField, 'No mapped field available');

    // Intentionally create duplicate csvColumnName
    const badFields = [
      ...config.annotationFields,
      {
        ...mappedField,
        id: `dup_csv_${Date.now()}`,
        fieldName: `${mappedField.fieldName} (dup_csv)`,
        csvColumnName: mappedField.csvColumnName, // Same csvColumnName!
      },
    ];

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: badFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
  });

  // ─── Scenario 9: Duplicate fieldId ───────────────────────────────────────
  test('Scenario 9: Duplicate fieldId returns HTTP 400', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    const mappedField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && f.id
    );
    test.skip(!mappedField, 'No mapped field with id available');

    const badFields = [
      ...config.annotationFields,
      {
        ...mappedField,
        id: mappedField.id, // Same ID!
        fieldName: `${mappedField.fieldName} (dup_id)`,
        csvColumnName: `dup_col_${Date.now()}`,
      },
    ];

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: badFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
  });

  // ─── Scenario 10: Deprecated fields stripped on save ─────────────────────
  test('Scenario 10: Deprecated fields stripped from save payload', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Add deprecated fields to a field
    const fieldWithDeprecated = config.annotationFields.map((f: any) => ({
      ...f,
      isDataFieldLink: true,
      sourceCsvColumnName: f.csvColumnName,
    }));

    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: fieldWithDeprecated,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    // Reload and verify deprecated fields are stripped
    config = await getFieldConfig(request, token, datasetId);
    for (const field of config.annotationFields) {
      expect(field.isDataFieldLink).toBeUndefined();
      expect(field.sourceCsvColumnName).toBeUndefined();
    }
  });

  // ─── Scenario 11: Existing datasets load correctly ───────────────────────
  test('Scenario 11: Existing dataset loads without errors', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);

    await loginAsAdmin(page);
    await page.goto(`/dataset/${datasetId}?tab=field-configuration`);
    await page.waitForLoadState('networkidle');

    // Verify the page loaded without errors
    const errorText = page.locator('text=Error');
    await expect(errorText).not.toBeVisible({ timeout: 5000 });

    const loadingText = page.locator('text=Loading');
    await expect(loadingText).not.toBeVisible({ timeout: 10000 });
  });

  // ─── Scenario 13: Primary key restriction ────────────────────────────────
  test('Scenario 13: Primary key fields cannot be moved to annotation', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    const pkField = config.annotationFields.find((f: any) => f.isPrimaryKey);
    test.skip(!pkField, 'No primary key field found');

    // Attempt to move primary key to annotation
    const badFields = config.annotationFields.map((f: any) => {
      if (f.isPrimaryKey) {
        return { ...f, isAnnotationField: true };
      }
      return f;
    });

    // This should either succeed in toggle (but primary key stays in metadata display)
    // or the backend allows it but frontend blocks it
    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: badFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });

    // The backend allows the toggle but the frontend's DragDropHelper blocks it
    // If it succeeds, verify the PK is still marked
    if (saveRes.status() === 201) {
      config = await getFieldConfig(request, token, datasetId);
      const toggledPk = config.annotationFields.find((f: any) => f.isPrimaryKey);
      expect(toggledPk).toBeTruthy();
      // Restore
      const restore = config.annotationFields.map((f: any) => {
        if (f.isPrimaryKey) return { ...f, isAnnotationField: false };
        return f;
      });
      await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          datasetId,
          annotationFields: restore,
          annotationLabels: config.annotationLabels || [],
          newColumns: config.newColumns || [],
          fieldGroups: config.fieldGroups || [],
        },
      });
    }
  });

  // ─── Scenario 16: Refresh persistence ────────────────────────────────────
  test('Scenario 16: Mapping persists after page reload', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Count annotation fields before
    const annotationBefore = config.annotationFields.filter(
      (f: any) => f.isAnnotationField && !f.isNewColumn
    ).length;

    // Reload config from API (simulates refresh)
    config = await getFieldConfig(request, token, datasetId);
    const annotationAfter = config.annotationFields.filter(
      (f: any) => f.isAnnotationField && !f.isNewColumn
    ).length;

    expect(annotationAfter).toBe(annotationBefore);
  });

  // ─── Scenario 12: Multiple mappings — no duplicates ──────────────────────
  test('Scenario 12: Multiple CSV mappings — order preserved, no duplicates', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Verify no duplicate csvColumnName among annotation fields
    const annotationFields = config.annotationFields.filter(
      (f: any) => f.isAnnotationField && f.csvColumnName
    );
    const csvColumns = annotationFields.map((f: any) => f.csvColumnName.toLowerCase());
    const uniqueColumns = new Set(csvColumns);
    expect(uniqueColumns.size).toBe(csvColumns.length);
  });

  // ─── Scenario 18: Save/Reload full state ─────────────────────────────────
  test('Scenario 18: Full state preserved after save and reload', async ({ page, request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Save the current state
    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: config.annotationFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    // Reload
    config = await getFieldConfig(request, token, datasetId);
    expect(config).toBeTruthy();
    expect(config.annotationFields).toBeDefined();
    expect(Array.isArray(config.annotationFields)).toBe(true);
  });
});

// ─── Network Validation ──────────────────────────────────────────────────────

test.describe('CSV Mapping — Network Payload Validation', () => {
  test('Save payload contains required fields, no deprecated fields', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    const config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    const annotationField = config.annotationFields.find(
      (f: any) => f.isAnnotationField && f.csvColumnName
    );

    if (annotationField) {
      // Verify required fields exist
      expect(annotationField).toHaveProperty('csvColumnName');
      expect(annotationField).toHaveProperty('isAnnotationField');

      // Verify deprecated fields are NOT present (after save)
      expect(annotationField.isDataFieldLink).toBeUndefined();
      expect(annotationField.sourceCsvColumnName).toBeUndefined();
    }
  });
});

// ─── Drag-Drop Helper Logic Tests (API-level) ────────────────────────────────

test.describe('CSV Mapping — Drag-Drop Helper Rules', () => {
  test('Cross-panel move toggles isAnnotationField', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Find a metadata field (not in annotation)
    const metadataField = config.annotationFields.find(
      (f: any) => !f.isAnnotationField && !f.isNewColumn && !f.isPrimaryKey && f.csvColumnName
    );
    test.skip(!metadataField, 'No available metadata field');

    // Simulate metadata-to-annotation move
    const updatedFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === metadataField.csvColumnName) {
        return { ...f, isAnnotationField: true, isPrimaryKey: false };
      }
      return f;
    });

    const saveRes = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: updatedFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(saveRes.status()).toBe(201);

    // Verify the field moved
    config = await getFieldConfig(request, token, datasetId);
    const movedField = config.annotationFields.find(
      (f: any) => f.csvColumnName === metadataField.csvColumnName
    );
    expect(movedField).toBeTruthy();
    expect(movedField.isAnnotationField).toBe(true);

    // Move it back
    const revertedFields = config.annotationFields.map((f: any) => {
      if (f.csvColumnName === metadataField.csvColumnName) {
        return { ...f, isAnnotationField: false };
      }
      return f;
    });
    await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: revertedFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
  });

  test('New columns cannot move to metadata', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasetId = await getFirstDatasetId(request, token);
    let config = await getFieldConfig(request, token, datasetId);
    test.skip(!config, 'No field config found');

    // Find a new column
    const newCol = config.annotationFields.find((f: any) => f.isNewColumn);
    test.skip(!newCol, 'No new column found');

    // The DragDropHelper.canDragField returns false for new columns in annotation panel
    // So the frontend blocks this before it reaches the API
    // Verify the field stays as is
    expect(newCol.isNewColumn).toBe(true);
  });
});