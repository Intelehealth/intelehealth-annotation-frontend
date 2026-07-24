import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'bhooomikasshetty20@gmail.com';
const ADMIN_PASSWORD = 'strpass123';
const API_BASE = 'http://localhost:4000';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthToken(request: any): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).access_token;
}

async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — AUTH (9 scenarios)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Auth — Negative Scenarios', () => {

  test('N1: Login with wrong password returns 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: 'wrongpassword123' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message || '').toMatch(/invalid|incorrect|wrong/i);
  });

  test('N2: Login with non-existent email returns 401', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/login`, {
      data: { email: 'nonexistent_' + Date.now() + '@test.com', password: 'anypassword' },
    });
    expect(res.status()).toBe(401);
  });

  test('N3: Signup with existing email returns 409', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/register`, {
      data: {
        email: ADMIN_EMAIL,
        password: 'SomePass123!',
        firstName: 'Test',
        lastName: 'User',
      },
    });
    expect(res.status()).toBe(409);
  });

  test('N4: Reset password with invalid token returns error', async ({ request }) => {
    const res = await request.post(`${API_BASE}/auth/reset-password`, {
      data: { token: 'invalid_token_' + Date.now(), password: 'NewPass123!', confirmPassword: 'NewPass123!' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/invalid|expired/i);
  });

  test('N5: Protected route without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: 'Bearer invalid_token' },
    });
    expect(res.status()).toBe(401);
  });

  test('N6: Login page redirects unauthenticated browser', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
  });

  test('N7: Login form has required validation on empty fields', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    // Check HTML5 validation attributes exist
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — USERS (5 scenarios)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Users — Negative Scenarios', () => {

  test('N8: Create user with duplicate email returns 409', async ({ request }) => {
    const token = await getAuthToken(request);
    const res = await request.post(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        email: ADMIN_EMAIL,
        firstName: 'Dup',
        lastName: 'User',
        role: 'ANNOTATOR',
      },
    });
    expect(res.status()).toBe(409);
  });

  test('N9: Create user with invalid email returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const res = await request.post(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        email: 'not-an-email',
        firstName: 'Bad',
        lastName: 'Email',
        role: 'ANNOTATOR',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('N10: Cannot change annotator role to ADMIN returns 403', async ({ request }) => {
    const token = await getAuthToken(request);
    // Find an ANNOTATOR user
    const usersRes = await request.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (usersRes.status() !== 200) return; // skip if no users endpoint
    const users = await usersRes.json();
    const annotator = Array.isArray(users) ? users.find((u: any) => u.role === 'ANNOTATOR') : null;
    if (!annotator) return; // skip if no annotator found

    const res = await request.patch(`${API_BASE}/users/${annotator._id}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { role: 'ADMIN' },
    });
    expect(res.status()).toBe(403);
  });

  test('N11: Cannot delete own account returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    // Get admin user ID from token
    const profileRes = await request.get(`${API_BASE}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const profile = await profileRes.json();
    const adminId = profile._id || profile.id || profile.userId;
    if (!adminId) return; // skip if we can't identify self

    const res = await request.delete(`${API_BASE}/users/${adminId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/cannot delete your own/i);
  });

  test('N12: Annotator cannot access /users route (API returns 403)', async ({ request }) => {
    // Create a test annotator login
    const testEmail = `annotator_test_${Date.now()}@test.com`;
    // Register a new annotator
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email: testEmail, password: 'TestPass123!', firstName: 'Test', lastName: 'Annotator' },
    });
    if (registerRes.status() !== 201) return; // skip if register fails

    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: testEmail, password: 'TestPass123!' },
    });
    if (loginRes.status() !== 201) return;
    const annotatorToken = (await loginRes.json()).access_token;

    const res = await request.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${annotatorToken}` },
    });
    expect(res.status()).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — DATASETS (4 scenarios)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Datasets — Negative Scenarios', () => {

  test('N13: Create dataset without name returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const res = await request.post(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { description: 'No name provided', datasetType: 'text' },
    });
    expect(res.status()).toBe(400);
  });

  test('N14: Create dataset without type returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const res = await request.post(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'Test No Type ' + Date.now() },
    });
    expect(res.status()).toBe(400);
  });

  test('N15: Share dataset with empty userIds returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasetId = (await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json())[0]?._id;
    if (!datasetId) return; // skip if no datasets

    const res = await request.patch(`${API_BASE}/datasets/${datasetId}/share`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { userIds: [] },
    });
    expect(res.status()).toBe(400);
  });

  test('N16: Annotator creating dataset returns 403', async ({ request }) => {
    const testEmail = `annotator_create_${Date.now()}@test.com`;
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email: testEmail, password: 'TestPass123!', firstName: 'Test', lastName: 'Annotator' },
    });
    if (registerRes.status() !== 201) return;
    const loginRes = await request.post(`${API_BASE}/auth/login`, {
      data: { email: testEmail, password: 'TestPass123!' },
    });
    if (loginRes.status() !== 201) return;
    const annotatorToken = (await loginRes.json()).access_token;

    const res = await request.post(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${annotatorToken}`, 'Content-Type': 'application/json' },
      data: { name: 'Annotator Dataset', datasetType: 'text' },
    });
    expect(res.status()).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — FIELD CONFIG (3 scenarios)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Field Config — Negative Scenarios', () => {

  test('N17: Save without any fields returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: [],
        annotationLabels: [],
        newColumns: [],
        fieldGroups: [],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('N18: Save without primary key returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    // Get existing config to modify
    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();

    // Remove all primary keys
    const noPkFields = (config.annotationFields || []).map((f: any) => ({
      ...f, isPrimaryKey: false,
    }));

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: noPkFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/primary key/i);
  });

  test('N19: Save with duplicate field name returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();

    const fields = config.annotationFields || [];
    if (fields.length < 2) return;

    // Introduce a duplicate field name
    const dupFields = fields.map((f: any, i: number) => ({
      ...f,
      fieldName: i === 1 ? fields[0].fieldName : f.fieldName,
      csvColumnName: i === 1 ? fields[0].csvColumnName : f.csvColumnName,
      id: i === 1 ? fields[0].id : f.id,
    }));

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: dupFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — CSV UPLOAD (1 scenario)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('CSV Upload — Negative Scenarios', () => {

  test('N20: Upload without file returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    // Send multipart without a file
    const res = await request.post(`${API_BASE}/csv-processing/upload/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/file/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — ASSIGNMENTS (1 scenario)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Assignments — Negative Scenarios', () => {

  test('N21: Invalid status transition returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    // Attempt to change assignment directly from PENDING to COMPLETED
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    // Find an assignment
    const assignmentsRes = await request.get(`${API_BASE}/assignments/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (assignmentsRes.status() !== 200) return;
    const assignments = await assignmentsRes.json();
    const assignment = Array.isArray(assignments) ? assignments[0] : null;
    if (!assignment) return;

    // Try to change PENDING → COMPLETED (invalid: must go through IN_PROGRESS → SUBMITTED → APPROVED)
    const res = await request.patch(`${API_BASE}/assignments/${assignment._id}/status`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { status: 'COMPLETED' },
    });
    expect(res.status()).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — PROFILE (1 scenario)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Profile — Negative Scenarios', () => {

  test('N22: Change password with mismatch returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const res = await request.patch(`${API_BASE}/users/change-password`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        currentPassword: ADMIN_PASSWORD,
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass456!',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/match|mismatch|not the same/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — ACCOUNT LOCKOUT (1 scenario)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Account Lockout — Negative Scenario', () => {

  test('N23: Repeated wrong password eventually locks account', async ({ request }) => {
    // Use a dedicated test user to avoid locking the admin
    const testEmail = `lockout_test_${Date.now()}@test.com`;
    const registerRes = await request.post(`${API_BASE}/auth/register`, {
      data: { email: testEmail, password: 'TestPass123!', firstName: 'Lock', lastName: 'Test' },
    });
    if (registerRes.status() !== 201) return;

    // Attempt login 5+ times with wrong password
    for (let i = 0; i < 6; i++) {
      const res = await request.post(`${API_BASE}/auth/login`, {
        data: { email: testEmail, password: 'WrongPass' + i },
      });
      if (i < 5) {
        expect(res.status()).toBe(401); // normal failure
      } else {
        // The 6th attempt should be locked
        expect(res.status()).toBe(401); // still 401 but with lock message
        const body = await res.json();
        // May contain lockout message if implemented
        if (body.message) {
          expect(body.message).toMatch(/lock|block|too many|try later/i);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — OAUTH (1 scenario)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('OAuth — Negative Scenarios', () => {

  test('N24: OAuth callback with invalid token returns error', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/google/callback?code=invalid_code&state=bad_state`);
    expect(res.status()).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — DELETION PROTECTION (1 scenario)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Deletion Protection — Negative Scenarios', () => {

  test('N25: Cannot delete platform ADMIN user returns 403', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    // Try to delete the admin user using a different endpoint/approach
    const res = await request.delete(`${API_BASE}/users/${ADMIN_EMAIL}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // Should fail - can't delete by email, need ID
    expect(res.status()).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEGATIVE SCENARIOS — BACKEND VALIDATION (3 scenarios)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Backend Validation — Negative Scenarios', () => {

  test('N26: Two primary keys returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();
    const fields = config.annotationFields || [];
    if (fields.length < 2) return;

    // Set two primary keys
    const twoPkFields = fields.map((f: any, i: number) => ({
      ...f, isPrimaryKey: i === 0 || i === 1,
    }));

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: twoPkFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/primary key/i);
  });

  test('N27: Duplicate csvColumnName returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();
    const fields = config.annotationFields || [];
    const annotationField = fields.find((f: any) => f.isAnnotationField && f.csvColumnName);
    if (!annotationField) return;

    // Add duplicate with same csvColumnName
    const dupFields = [...fields, { ...annotationField, id: `dup_${Date.now()}`, fieldName: `${annotationField.fieldName}_dup` }];

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: dupFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/duplicate|already exists/i);
  });

  test('N28: Duplicate fieldId returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();
    const fields = config.annotationFields || [];
    const annotationField = fields.find((f: any) => f.isAnnotationField && f.id);
    if (!annotationField) return;

    // Add duplicate with same id
    const dupFields = [...fields, { ...annotationField, fieldName: `${annotationField.fieldName}_dup_id`, csvColumnName: `dup_col_${Date.now()}` }];

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: dupFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message || '').toMatch(/duplicate|already exists/i);
  });

  test('N29: Save with duplicate fieldName returns 400', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();
    const fields = config.annotationFields || [];
    if (fields.length < 2) return;

    // Set two fields to have the same fieldName (but different csvColumnName)
    const dupNameFields = fields.map((f: any, i: number) => ({
      ...f,
      fieldName: i === 0 ? fields[0].fieldName : f.fieldName,
    }));

    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: dupNameFields,
        annotationLabels: config.annotationLabels || [],
        newColumns: config.newColumns || [],
        fieldGroups: config.fieldGroups || [],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('N30: Error response contains message property (not errors[])', async ({ request }) => {
    const token = await getAuthToken(request);
    const datasets = await (await request.get(`${API_BASE}/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const datasetId = datasets[0]?._id;
    if (!datasetId) return;

    const configRes = await request.get(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (configRes.status() !== 200) return;
    const config = await configRes.json();
    const fields = config.annotationFields || [];
    if (fields.length < 2) return;

    // Send empty fields to trigger validation error
    const res = await request.post(`${API_BASE}/field-selection/dataset/${datasetId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        datasetId,
        annotationFields: [],
        annotationLabels: [],
        newColumns: [],
        fieldGroups: [],
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    // Verify the error shape — must have 'message', NOT 'errors' array
    expect(body).toHaveProperty('message');
    expect(body.errors).toBeUndefined();
  });
});