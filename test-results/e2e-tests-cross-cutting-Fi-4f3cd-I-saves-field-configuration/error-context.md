# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\cross-cutting.spec.ts >> Field Config - Cross-Cutting >> Backend API saves field configuration
- Location: e2e\tests\cross-cutting.spec.ts:286:7

# Error details

```
Error: Login failed (401): {"statusCode":401,"timestamp":"2026-07-13T14:57:38.012Z","path":"/auth/login","method":"POST","error":"Unauthorized","message":"Invalid credentials"}
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { MongoClient, ObjectId } from 'mongodb';
  3   | 
  4   | test.setTimeout(120000);
  5   | 
  6   | const API = 'http://localhost:5000';
  7   | const MONGO_URI = 'mongodb://127.0.0.1:27017';
  8   | const DB_NAME = 'dyno_annotation_test';
  9   | const ADMIN_EMAIL = 'bhooomikasshetty20@gmail.com';
  10  | const ADMIN_PASSWORD = 'strpass123';
  11  | 
  12  | interface AdminSession {
  13  |   accessToken: string;
  14  |   userId: string;
  15  |   user: any;
  16  | }
  17  | 
  18  | let mongoClient: MongoClient;
  19  | let session: AdminSession;
  20  | let datasetId: string;
  21  | 
  22  | let issues: string[] = [];
  23  | 
  24  | function logIssue(feature: string, message: string, error?: any) {
  25  |   const msg = `[${feature}] ${message}${error ? ` - ${error.message || error}` : ''}`;
  26  |   issues.push(msg);
  27  |   console.error(msg);
  28  | }
  29  | 
  30  | test.beforeAll(async () => {
  31  |   try {
  32  |     mongoClient = new MongoClient(MONGO_URI);
  33  |     await mongoClient.connect();
  34  |   } catch (e) {
  35  |     logIssue('Setup', 'MongoDB connection failed', e);
  36  |   }
  37  | });
  38  | 
  39  | test.afterAll(async () => {
  40  |   if (mongoClient) await mongoClient.close();
  41  |   console.log('\n========================================');
  42  |   console.log('ISSUES FOUND:', issues.length);
  43  |   console.log('========================================');
  44  |   issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  45  |   console.log('========================================\n');
  46  | });
  47  | 
  48  | async function adminLogin(): Promise<AdminSession> {
  49  |   const res = await fetch(`${API}/auth/login`, {
  50  |     method: 'POST',
  51  |     headers: { 'Content-Type': 'application/json' },
  52  |     body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  53  |   });
> 54  |   if (!res.ok) throw new Error(`Login failed (${res.status}): ${await res.text()}`);
      |                      ^ Error: Login failed (401): {"statusCode":401,"timestamp":"2026-07-13T14:57:38.012Z","path":"/auth/login","method":"POST","error":"Unauthorized","message":"Invalid credentials"}
  55  |   const data = await res.json();
  56  |   return { accessToken: data.accessToken, userId: data.user._id || data.userId, user: data.user };
  57  | }
  58  | 
  59  | async function apiLoginAndNavigate(page: Page) {
  60  |   await page.goto('/login', { waitUntil: 'domcontentloaded' });
  61  |   await page.evaluate((s) => {
  62  |     localStorage.setItem('accessToken', s.accessToken);
  63  |     localStorage.setItem('user', JSON.stringify(s.user));
  64  |   }, session);
  65  | }
  66  | 
  67  | // ============================================================
  68  | // 1. AUTH - Backend API + Frontend UI + MongoDB
  69  | // ============================================================
  70  | test.describe('Auth - Cross-Cutting', () => {
  71  |   test('Backend API login returns valid JWT token', async () => {
  72  |     try {
  73  |       const res = await fetch(`${API}/auth/login`, {
  74  |         method: 'POST',
  75  |         headers: { 'Content-Type': 'application/json' },
  76  |         body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  77  |       });
  78  |       expect(res.status).toBe(201);
  79  |       const data = await res.json();
  80  |       expect(data.accessToken).toBeTruthy();
  81  |       expect(data.user.email).toBe(ADMIN_EMAIL);
  82  |       expect(data.user.role).toBe('ADMIN');
  83  |       session = { accessToken: data.accessToken, userId: data.user._id, user: data.user };
  84  |     } catch (e) {
  85  |       logIssue('Auth', 'Backend login API failed', e);
  86  |     }
  87  |   });
  88  | 
  89  |   test('MongoDB has admin user record', async () => {
  90  |     try {
  91  |       const db = mongoClient.db(DB_NAME);
  92  |       const user = await db.collection('users').findOne({ email: ADMIN_EMAIL });
  93  |       expect(user).toBeTruthy();
  94  |       expect(user!.role).toBe('ADMIN');
  95  |       expect(user!.isActive).toBe(true);
  96  |     } catch (e) {
  97  |       logIssue('Auth', 'Admin user not found in MongoDB or invalid', e);
  98  |     }
  99  |   });
  100 | 
  101 |   test('Frontend login page renders correctly', async ({ page }) => {
  102 |     try {
  103 |       await page.goto('/login', { waitUntil: 'load' });
  104 |       await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  105 |       await page.screenshot({ path: `screenshots/auth-login-page.png` });
  106 |       expect(await page.isVisible('text=Welcome Back')).toBe(true);
  107 |       expect(await page.isVisible('text=Sign In')).toBe(true);
  108 |     } catch (e) {
  109 |       logIssue('Auth', 'Login page UI rendering failed', e);
  110 |     }
  111 |   });
  112 | 
  113 |   test('Frontend login with valid credentials redirects to dashboard', async ({ page }) => {
  114 |     try {
  115 |       await page.goto('/login', { waitUntil: 'load' });
  116 |       await page.waitForSelector('text=Welcome Back', { timeout: 10000 });
  117 |       await page.fill('input[type="email"]', ADMIN_EMAIL);
  118 |       await page.fill('#password', ADMIN_PASSWORD);
  119 |       await page.click('button[type="submit"]');
  120 |       await page.waitForURL('**/dashboard', { timeout: 15000 });
  121 |       await page.screenshot({ path: `screenshots/auth-login-success.png` });
  122 |       expect(page.url()).toContain('/dashboard');
  123 |     } catch (e) {
  124 |       logIssue('Auth', 'Frontend login flow failed', e);
  125 |     }
  126 |   });
  127 | });
  128 | 
  129 | // ============================================================
  130 | // 2. USERS - Backend API + Frontend UI + MongoDB
  131 | // ============================================================
  132 | test.describe('Users - Cross-Cutting', () => {
  133 |   test.beforeAll(async () => {
  134 |     if (!session) session = await adminLogin();
  135 |   });
  136 | 
  137 |   test('Backend API lists users', async () => {
  138 |     try {
  139 |       const res = await fetch(`${API}/users`, {
  140 |         headers: { Authorization: `Bearer ${session.accessToken}` },
  141 |       });
  142 |       expect(res.status).toBe(200);
  143 |       const users = await res.json();
  144 |       expect(Array.isArray(users)).toBe(true);
  145 |       expect(users.length).toBeGreaterThan(0);
  146 |     } catch (e) {
  147 |       logIssue('Users', 'Backend users API failed', e);
  148 |     }
  149 |   });
  150 | 
  151 |   test('Backend API creates a new user', async () => {
  152 |     try {
  153 |       const email = `testuser_${Date.now()}@example.com`;
  154 |       const res = await fetch(`${API}/users`, {
```