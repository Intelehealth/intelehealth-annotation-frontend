import { Page } from '@playwright/test';

export const API_URL = process.env.API_URL || 'http://localhost:5000';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin.test@example.com';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TestAdminPassword123!';

export interface AdminSession {
  accessToken: string;
  userId: string;
  user: Record<string, unknown>;
}

export interface SeededData {
  datasetId: string;
  datasetName: string;
}

export async function adminLogin(): Promise<AdminSession> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Admin login failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.accessToken, userId: data.user._id || data.userId, user: data.user };
}

export async function loginAndNavigate(page: Page, url: string, session: AdminSession) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(({ accessToken, userJson }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', userJson);
  }, { accessToken: session.accessToken, userJson: JSON.stringify(session.user) });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000);
}

export async function createDataset(token: string, name: string): Promise<string> {
  const res = await fetch(`${API_URL}/datasets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, datasetType: 'text' }),
  });
  if (!res.ok) throw new Error(`Dataset creation failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data._id || data.id;
}

export async function addAvailableColumns(token: string, datasetId: string, columns: string[]) {
  const { MongoClient, ObjectId } = await import('mongodb');
  const client = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db('dyno_annotation_test');
  await db.collection('datasets').updateOne(
    { _id: new ObjectId(datasetId) },
    { $set: { availableColumns: columns.map(n => ({ name: n, source: 'CSV' as const, csvImportId: null })) } },
  );
  await client.close();
}

export async function cleanupDataset(token: string, datasetId: string) {
  await fetch(`${API_URL}/datasets/${datasetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export async function seedTestData(columns?: string[]): Promise<{ session: AdminSession; data: SeededData }> {
  const session = await adminLogin();
  const datasetName = `E2E Test ${Date.now()}`;
  const datasetId = await createDataset(session.accessToken, datasetName);
  if (columns && columns.length > 0) {
    await addAvailableColumns(session.accessToken, datasetId, columns);
  }
  return { session, data: { datasetId, datasetName } };
}

export async function navigateToFieldConfig(page: Page, datasetId: string, session: AdminSession) {
  await loginAndNavigate(page, `/dataset/${datasetId}`, session);
  await page.waitForTimeout(2000);
  const btn = page.getByRole('button', { name: /Configure Fields/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(2000);
    await page.waitForSelector('text=Add New Field', { timeout: 15000 }).catch(() => {});
  } else {
    await page.goto(`/dataset/${datasetId}?tab=field-configuration`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2000);
  }
}

export async function saveConfig(page: Page) {
  await page.getByRole('button', { name: /Save Configuration/i }).click();
  await page.waitForTimeout(1500);
}