# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\field-config.spec.ts >> Create Field Configuration >> selecting a CSV column creates a field card
- Location: e2e\tests\field-config.spec.ts:75:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | import { Page } from '@playwright/test';
  2  | 
  3  | export const API_URL = process.env.API_URL || 'http://localhost:5000';
  4  | export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin.test@example.com';
  5  | export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TestAdminPassword123!';
  6  | 
  7  | export interface AdminSession {
  8  |   accessToken: string;
  9  |   userId: string;
  10 |   user: Record<string, unknown>;
  11 | }
  12 | 
  13 | export interface SeededData {
  14 |   datasetId: string;
  15 |   datasetName: string;
  16 | }
  17 | 
  18 | export async function adminLogin(): Promise<AdminSession> {
  19 |   const res = await fetch(`${API_URL}/auth/login`, {
  20 |     method: 'POST',
  21 |     headers: { 'Content-Type': 'application/json' },
  22 |     body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  23 |   });
  24 |   if (!res.ok) throw new Error(`Admin login failed (${res.status}): ${await res.text()}`);
  25 |   const data = await res.json();
  26 |   return { accessToken: data.accessToken, userId: data.user._id || data.userId, user: data.user };
  27 | }
  28 | 
  29 | export async function loginAndNavigate(page: Page, url: string, session: AdminSession) {
> 30 |   await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  31 |   await page.evaluate(({ accessToken, userJson }) => {
  32 |     localStorage.setItem('accessToken', accessToken);
  33 |     localStorage.setItem('user', userJson);
  34 |   }, { accessToken: session.accessToken, userJson: JSON.stringify(session.user) });
  35 |   await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  36 |   await page.waitForTimeout(2000);
  37 | }
  38 | 
  39 | export async function createDataset(token: string, name: string): Promise<string> {
  40 |   const res = await fetch(`${API_URL}/datasets`, {
  41 |     method: 'POST',
  42 |     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  43 |     body: JSON.stringify({ name, datasetType: 'text' }),
  44 |   });
  45 |   if (!res.ok) throw new Error(`Dataset creation failed (${res.status}): ${await res.text()}`);
  46 |   const data = await res.json();
  47 |   return data._id || data.id;
  48 | }
  49 | 
  50 | export async function addAvailableColumns(token: string, datasetId: string, columns: string[]) {
  51 |   const { MongoClient, ObjectId } = await import('mongodb');
  52 |   const client = new MongoClient('mongodb://127.0.0.1:27017', { serverSelectionTimeoutMS: 10000 });
  53 |   await client.connect();
  54 |   const db = client.db('dyno_annotation_test');
  55 |   await db.collection('datasets').updateOne(
  56 |     { _id: new ObjectId(datasetId) },
  57 |     { $set: { availableColumns: columns.map(n => ({ name: n, source: 'CSV' as const, csvImportId: null })) } },
  58 |   );
  59 |   await client.close();
  60 | }
  61 | 
  62 | export async function cleanupDataset(token: string, datasetId: string) {
  63 |   await fetch(`${API_URL}/datasets/${datasetId}`, {
  64 |     method: 'DELETE',
  65 |     headers: { Authorization: `Bearer ${token}` },
  66 |   }).catch(() => {});
  67 | }
  68 | 
  69 | export async function seedTestData(columns?: string[]): Promise<{ session: AdminSession; data: SeededData }> {
  70 |   const session = await adminLogin();
  71 |   const datasetName = `E2E Test ${Date.now()}`;
  72 |   const datasetId = await createDataset(session.accessToken, datasetName);
  73 |   if (columns && columns.length > 0) {
  74 |     await addAvailableColumns(session.accessToken, datasetId, columns);
  75 |   }
  76 |   return { session, data: { datasetId, datasetName } };
  77 | }
  78 | 
  79 | export async function navigateToFieldConfig(page: Page, datasetId: string, session: AdminSession) {
  80 |   await loginAndNavigate(page, `/dataset/${datasetId}`, session);
  81 |   await page.waitForTimeout(2000);
  82 |   const btn = page.getByRole('button', { name: /Configure Fields/i });
  83 |   if (await btn.isVisible().catch(() => false)) {
  84 |     await btn.click();
  85 |     await page.waitForTimeout(2000);
  86 |     await page.waitForSelector('text=Add New Field', { timeout: 15000 }).catch(() => {});
  87 |   } else {
  88 |     await page.goto(`/dataset/${datasetId}?tab=field-configuration`, { waitUntil: 'load', timeout: 60000 });
  89 |     await page.waitForTimeout(2000);
  90 |   }
  91 | }
  92 | 
  93 | export async function saveConfig(page: Page) {
  94 |   await page.getByRole('button', { name: /Save Configuration/i }).click();
  95 |   await page.waitForTimeout(1500);
  96 | }
```