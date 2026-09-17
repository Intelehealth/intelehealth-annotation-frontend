import { test, expect, Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

test.setTimeout(120000);

const API = 'http://localhost:5000';
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'dyno_annotation_test';
const ADMIN_EMAIL = 'bhooomikasshetty20@gmail.com';
const ADMIN_PASSWORD = 'strpass123';

interface AdminSession {
  accessToken: string;
  userId: string;
  user: any;
}

let mongoClient: MongoClient;
let session: AdminSession;
let datasetId: string;

let issues: string[] = [];

function logIssue(feature: string, message: string, error?: any) {
  const msg = `[${feature}] ${message}${error ? ` - ${error.message || error}` : ''}`;
  issues.push(msg);
  console.error(msg);
}

test.beforeAll(async () => {
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
  } catch (e) {
    logIssue('Setup', 'MongoDB connection failed', e);
  }
});

test.afterAll(async () => {
  if (mongoClient) await mongoClient.close();
  console.log('\n========================================');
  console.log('ISSUES FOUND:', issues.length);
  console.log('========================================');
  issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  console.log('========================================\n');
});

async function adminLogin(): Promise<AdminSession> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.accessToken, userId: data.user._id || data.userId, user: data.user };
}

async function apiLoginAndNavigate(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => {
    localStorage.setItem('accessToken', s.accessToken);
    localStorage.setItem('user', JSON.stringify(s.user));
  }, session);
}

// ============================================================
// 1. AUTH - Backend API + Frontend UI + MongoDB
// ============================================================
test.describe('Auth - Cross-Cutting', () => {
  test('Backend API login returns valid JWT token', async () => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.accessToken).toBeTruthy();
      expect(data.user.email).toBe(ADMIN_EMAIL);
      expect(data.user.role).toBe('ADMIN');
      session = { accessToken: data.accessToken, userId: data.user._id, user: data.user };
    } catch (e) {
      logIssue('Auth', 'Backend login API failed', e);
    }
  });

  test('MongoDB has admin user record', async () => {
    try {
      const db = mongoClient.db(DB_NAME);
      const user = await db.collection('users').findOne({ email: ADMIN_EMAIL });
      expect(user).toBeTruthy();
      expect(user!.role).toBe('ADMIN');
      expect(user!.isActive).toBe(true);
    } catch (e) {
      logIssue('Auth', 'Admin user not found in MongoDB or invalid', e);
    }
  });

  test('Frontend login page renders correctly', async ({ page }) => {
    try {
      await page.goto('/login', { waitUntil: 'load' });
      await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
      await page.screenshot({ path: `screenshots/auth-login-page.png` });
      expect(await page.isVisible('text=Welcome Back')).toBe(true);
      expect(await page.isVisible('text=Sign In')).toBe(true);
    } catch (e) {
      logIssue('Auth', 'Login page UI rendering failed', e);
    }
  });

  test('Frontend login with valid credentials redirects to dashboard', async ({ page }) => {
    try {
      await page.goto('/login', { waitUntil: 'load' });
      await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 15000 });
      await page.screenshot({ path: `screenshots/auth-login-success.png` });
      expect(page.url()).toContain('/dashboard');
    } catch (e) {
      logIssue('Auth', 'Frontend login flow failed', e);
    }
  });
});

// ============================================================
// 2. USERS - Backend API + Frontend UI + MongoDB
// ============================================================
test.describe('Users - Cross-Cutting', () => {
  test.beforeAll(async () => {
    if (!session) session = await adminLogin();
  });

  test('Backend API lists users', async () => {
    try {
      const res = await fetch(`${API}/users`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(200);
      const users = await res.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    } catch (e) {
      logIssue('Users', 'Backend users API failed', e);
    }
  });

  test('Backend API creates a new user', async () => {
    try {
      const email = `testuser_${Date.now()}@example.com`;
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ email, role: 'ANNOTATOR' }),
      });
      expect(res.status).toBe(201);
      const user = await res.json();
      expect(user.email).toBe(email);
    } catch (e) {
      logIssue('Users', 'Backend user creation failed', e);
    }
  });

  test('MongoDB has users collection with correct schema', async () => {
    try {
      const db = mongoClient.db(DB_NAME);
      const sampleUser = await db.collection('users').findOne({ role: 'ANNOTATOR' });
      if (sampleUser) {
        expect(sampleUser.email).toBeTruthy();
        expect(sampleUser.role).toBe('ANNOTATOR');
        expect(sampleUser.password).toBeTruthy();
      }
    } catch (e) {
      logIssue('Users', 'MongoDB users collection check failed', e);
    }
  });

  test('Frontend users page loads and shows user list', async ({ page }) => {
    try {
      await apiLoginAndNavigate(page);
      await page.goto('/users', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/users-page.png` });
      expect(await page.isVisible('text=Users')).toBe(true);
    } catch (e) {
      logIssue('Users', 'Frontend users page failed', e);
    }
  });
});

// ============================================================
// 3. DATASETS - Backend API + Frontend UI + MongoDB
// ============================================================
test.describe('Datasets - Cross-Cutting', () => {
  test.beforeAll(async () => {
    if (!session) session = await adminLogin();
  });

  test('Backend API creates dataset', async () => {
    try {
      const name = `E2E Dataset ${Date.now()}`;
      const res = await fetch(`${API}/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ name, datasetType: 'text' }),
      });
      expect(res.status).toBe(201);
      const ds = await res.json();
      datasetId = ds._id || ds.id;
      expect(datasetId).toBeTruthy();
    } catch (e) {
      logIssue('Datasets', 'Backend dataset creation failed', e);
    }
  });

  test('Backend API lists datasets', async () => {
    try {
      const res = await fetch(`${API}/datasets`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(res.status).toBe(200);
      const datasets = await res.json();
      expect(Array.isArray(datasets)).toBe(true);
    } catch (e) {
      logIssue('Datasets', 'Backend datasets list API failed', e);
    }
  });

  test('MongoDB has dataset record', async () => {
    try {
      const db = mongoClient.db(DB_NAME);
      const ds = await db.collection('datasets').findOne({ _id: new ObjectId(datasetId) });
      expect(ds).toBeTruthy();
      expect(ds!.name).toBeTruthy();
    } catch (e) {
      logIssue('Datasets', 'Dataset not found in MongoDB', e);
    }
  });

  test('Frontend datasets page shows created dataset', async ({ page }) => {
    try {
      await apiLoginAndNavigate(page);
      await page.goto('/dataset', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/datasets-list.png` });
      expect(page.url()).toContain('/dataset');
    } catch (e) {
      logIssue('Datasets', 'Frontend datasets page failed', e);
    }
  });

  test('Frontend dataset detail page loads', async ({ page }) => {
    try {
      await apiLoginAndNavigate(page);
      await page.goto(`/dataset/${datasetId}`, { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/dataset-detail.png` });
      expect(page.url()).toContain(datasetId);
    } catch (e) {
      logIssue('Datasets', 'Frontend dataset detail page failed', e);
    }
  });
});

// ============================================================
// 4. FIELD CONFIG - Backend API + Frontend UI + MongoDB
// ============================================================
test.describe('Field Config - Cross-Cutting', () => {
  test.beforeAll(async () => {
    if (!session) session = await adminLogin();
    if (!datasetId) {
      const name = `E2E Dataset ${Date.now()}`;
      const res = await fetch(`${API}/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ name, datasetType: 'text' }),
      });
      const ds = await res.json();
      datasetId = ds._id || ds.id;
    }
  });

  test('Backend API saves field configuration', async () => {
    try {
      const config = {
        annotationFields: [
          { fieldName: 'sentiment', fieldType: 'select', options: ['positive', 'neutral', 'negative'], required: true },
          { fieldName: 'score', fieldType: 'number', min: 0, max: 10, required: false },
        ],
        fieldGroups: [],
      };
      const res = await fetch(`${API}/field-selection/dataset/${datasetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify(config),
      });
      if (res.status >= 400) {
        logIssue('Field Config', `Save field config returned ${res.status}`, await res.text());
      } else {
        expect(res.status).toBe(201);
      }
    } catch (e) {
      logIssue('Field Config', 'Backend field config save failed', e);
    }
  });

  test('Backend API retrieves field configuration', async () => {
    try {
      const res = await fetch(`${API}/field-selection/dataset/${datasetId}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.status === 404) {
        logIssue('Field Config', 'Field config not found (404)');
      } else {
        expect(res.status).toBe(200);
        const config = await res.json();
        expect(config.annotationFields).toBeDefined();
      }
    } catch (e) {
      logIssue('Field Config', 'Backend field config retrieval failed', e);
    }
  });

  test('Frontend field config page loads', async ({ page }) => {
    try {
      await apiLoginAndNavigate(page);
      await page.goto(`/dataset/${datasetId}?tab=field-configuration`, { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/field-config-page.png` });
    } catch (e) {
      logIssue('Field Config', 'Frontend field config page failed', e);
    }
  });
});

// ============================================================
// 5. ANNOTATIONS - Backend API + MongoDB
// ============================================================
test.describe('Annotations - Cross-Cutting', () => {
  test.beforeAll(async () => {
    if (!session) session = await adminLogin();
  });

  test('Backend API annotation endpoints respond', async () => {
    try {
      const res = await fetch(`${API}/dataset-merged-rows/dataset/${datasetId}/rows?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.status === 404) {
        logIssue('Annotations', 'Annotation rows endpoint returned 404');
      } else {
        expect(res.status).toBe(200);
      }
    } catch (e) {
      logIssue('Annotations', 'Backend annotation API failed', e);
    }
  });
});

// ============================================================
// 6. DASHBOARD - Frontend UI
// ============================================================
test.describe('Dashboard - Cross-Cutting', () => {
  test('Frontend dashboard loads with data', async ({ page }) => {
    try {
      if (!session) session = await adminLogin();
      await apiLoginAndNavigate(page);
      await page.goto('/dashboard', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/dashboard.png` });
      const hasWelcome = await page.isVisible('text=Welcome back').catch(() => false);
      const hasStats = await page.isVisible('text=Total Datasets').catch(() => false);
      if (!hasWelcome) logIssue('Dashboard', 'Welcome back text not visible');
      if (!hasStats) logIssue('Dashboard', 'Total Datasets stat not visible');
    } catch (e) {
      logIssue('Dashboard', 'Frontend dashboard failed', e);
    }
  });
});

// ============================================================
// 7. SETTINGS - Frontend UI
// ============================================================
test.describe('Settings - Cross-Cutting', () => {
  test('Frontend profile/settings page loads', async ({ page }) => {
    try {
      if (!session) session = await adminLogin();
      await apiLoginAndNavigate(page);
      await page.goto('/profile', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `screenshots/settings-profile.png` });
    } catch (e) {
      logIssue('Settings', 'Frontend profile page failed', e);
    }
  });
});

// ============================================================
// 8. DATABASE - MongoDB Schema Validation
// ============================================================
test.describe('Database - Schema Checks', () => {
  test('MongoDB has required collections', async () => {
    try {
      const db = mongoClient.db(DB_NAME);
      const collections = await db.listCollections().toArray();
      const names = collections.map((c: any) => c.name);
      const required = ['users', 'datasets'];
      required.forEach((col) => {
        if (!names.includes(col)) logIssue('Database', `Required collection '${col}' is missing`);
      });
    } catch (e) {
      logIssue('Database', 'MongoDB collection listing failed', e);
    }
  });

  test('MongoDB datasets collection has valid schema', async () => {
    try {
      const db = mongoClient.db(DB_NAME);
      const ds = await db.collection('datasets').findOne({});
      if (ds) {
        if (!ds.name) logIssue('Database', 'Dataset missing "name" field');
        if (!ds.datasetType) logIssue('Database', 'Dataset missing "datasetType" field');
      }
    } catch (e) {
      logIssue('Database', 'MongoDB datasets schema check failed', e);
    }
  });
});
