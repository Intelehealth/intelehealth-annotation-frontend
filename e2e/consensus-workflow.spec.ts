import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:4000';
const ADMIN_EMAIL = 'bhooomikasshetty20@gmail.com';
const ADMIN_PASSWORD = 'strpass123';

async function loginApi(request: APIRequestContext) {
  const response = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).accessToken as string;
}

async function firstParentDataset(request: APIRequestContext, token: string) {
  const response = await request.get(`${API}/datasets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  const datasets = await response.json();
  const dataset = datasets.find((item: any) => !item.isClone && item.isActive !== false);
  expect(dataset?._id).toBeTruthy();
  return dataset;
}

async function loginPage(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Review Consensus backend contract', () => {
  test('debug endpoint reports the complete clone and annotation path', async ({ request }) => {
    const token = await loginApi(request);
    const dataset = await firstParentDataset(request, token);
    const response = await request.get(`${API}/consensus/${dataset._id}/debug`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok()).toBeTruthy();
    const debug = await response.json();
    expect(debug.dataset.id).toBe(dataset._id);
    expect(debug.clones).toHaveProperty('count');
    expect(debug.assignments).toHaveProperty('count');
    expect(debug.parentRows).toHaveProperty('totalRows');
    expect(debug.liveAggregation).toHaveProperty('annotators');
    expect(debug.liveAggregation).toHaveProperty('rowDiagnostics');
    expect(debug).toHaveProperty('warnings');
    expect(debug).toHaveProperty('errors');
  });

  test('grid returns live normalized answers and progress', async ({ request }) => {
    const token = await loginApi(request);
    const dataset = await firstParentDataset(request, token);
    const response = await request.get(`${API}/consensus/${dataset._id}/grid?page=1&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok()).toBeTruthy();
    const grid = await response.json();
    expect(grid.totalRows).toBeGreaterThanOrEqual(0);
    expect(grid).toHaveProperty('annotators');
    expect(grid).toHaveProperty('progress');
    if (grid.rows.length > 0) {
      expect(grid.rows[0]).toHaveProperty('fields');
      expect(grid.rows[0]).toHaveProperty('taskAnnotations');
      expect(grid.rows[0].fields[0]).toHaveProperty('annotatorAnswers');
      expect(grid.rows[0].fields[0]).toHaveProperty('pendingAnnotatorIds');
    }
  });

  test('progress returns per-annotator completion', async ({ request }) => {
    const token = await loginApi(request);
    const dataset = await firstParentDataset(request, token);
    const response = await request.get(`${API}/consensus/${dataset._id}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok()).toBeTruthy();
    const progress = await response.json();
    expect(progress).toHaveProperty('annotators');
    for (const annotator of progress.annotators) {
      expect(annotator).toMatchObject({
        annotatorId: expect.any(String),
        assignedRows: expect.any(Number),
        completedRows: expect.any(Number),
        completionPercentage: expect.any(Number),
      });
    }
  });

  test('generation preserves the normalized grid values', async ({ request }) => {
    const token = await loginApi(request);
    const dataset = await firstParentDataset(request, token);
    const headers = { Authorization: `Bearer ${token}` };
    const before = await (await request.get(`${API}/consensus/${dataset._id}/grid?page=1&pageSize=50`, { headers })).json();
    const generated = await request.post(`${API}/consensus/${dataset._id}/generate`, { headers, data: {} });
    expect(generated.ok()).toBeTruthy();
    const after = await (await request.get(`${API}/consensus/${dataset._id}/grid?page=1&pageSize=50`, { headers })).json();

    expect(after.totalRows).toBe(before.totalRows);
    expect(after.rows.map((row: any) => row.rowIndex)).toEqual(before.rows.map((row: any) => row.rowIndex));
    expect(after.rows[0]?.fields?.map((field: any) => field.annotatorValues)).toEqual(
      before.rows[0]?.fields?.map((field: any) => field.annotatorValues),
    );
  });
});

test.describe('Review Consensus page', () => {
  test('renders live progress and expandable answer comparison', async ({ page, request }) => {
    const token = await loginApi(request);
    const dataset = await firstParentDataset(request, token);
    await loginPage(page);
    await page.goto(`/dataset/${dataset._id}/consensus`);

    await expect(page.getByText('Review Consensus').first()).toBeVisible();
    await expect(page.getByText('Annotator Progress')).toBeVisible();
    await expect(page.getByText('Questions')).toBeVisible();
    await expect(page.getByText('Answers')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review Again' })).toBeVisible();
  });
});
