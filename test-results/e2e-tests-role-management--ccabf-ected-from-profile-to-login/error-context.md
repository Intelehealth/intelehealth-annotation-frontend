# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\role-management.spec.ts >> Role-Based Access Control >> Protected Routes >> unauthenticated user redirected from /profile to /login
- Location: e2e\tests\role-management.spec.ts:79:9

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/profile", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { adminLogin, loginAndNavigate, type AdminSession } from './test-utils';
  3  | 
  4  | let adminSession: AdminSession;
  5  | 
  6  | test.beforeAll(async () => {
  7  |   adminSession = await adminLogin();
  8  | });
  9  | 
  10 | test.describe('Role-Based Access Control', () => {
  11 |   test.describe('Admin View', () => {
  12 |     test.beforeEach(async ({ page }) => {
  13 |       await loginAndNavigate(page, '/dashboard', adminSession);
  14 |     });
  15 | 
  16 |     test('admin sees Dashboard link', async ({ page }) => {
  17 |       await expect(page.getByText('Dashboard').first()).toBeVisible();
  18 |     });
  19 | 
  20 |     test('admin sees Datasets link', async ({ page }) => {
  21 |       await expect(page.getByText('Datasets').first()).toBeVisible();
  22 |     });
  23 | 
  24 |     test('admin sees Users link', async ({ page }) => {
  25 |       await expect(page.getByText('Users').first()).toBeVisible();
  26 |     });
  27 | 
  28 |     test('admin sees Profile Settings link', async ({ page }) => {
  29 |       await expect(page.getByText('Profile Settings')).toBeVisible();
  30 |     });
  31 | 
  32 |     test('admin does NOT see My Tasks link', async ({ page }) => {
  33 |       await expect(page.getByText('My Tasks')).not.toBeVisible();
  34 |     });
  35 | 
  36 |     test('admin sees admin role badge', async ({ page }) => {
  37 |       const badges = page.locator('text=Admin');
  38 |       await expect(badges.first()).toBeVisible();
  39 |     });
  40 | 
  41 |     test('admin can navigate to /users', async ({ page }) => {
  42 |       const usersLink = page.locator('a[href="/users"]');
  43 |       if (await usersLink.isVisible().catch(() => false)) {
  44 |         await usersLink.click();
  45 |         await page.waitForURL('**/users', { timeout: 10000 });
  46 |         expect(page.url()).toContain('/users');
  47 |       }
  48 |     });
  49 | 
  50 |     test('admin can navigate to /dataset', async ({ page }) => {
  51 |       const datasetLink = page.locator('a[href="/dataset"]');
  52 |       if (await datasetLink.isVisible().catch(() => false)) {
  53 |         await datasetLink.click();
  54 |         await page.waitForURL('**/dataset', { timeout: 10000 });
  55 |         expect(page.url()).toContain('/dataset');
  56 |       }
  57 |     });
  58 |   });
  59 | 
  60 |   test.describe('Protected Routes', () => {
  61 |     test('unauthenticated user redirected from /dashboard to /login', async ({ page }) => {
  62 |       await page.goto('/dashboard', { waitUntil: 'load' });
  63 |       await page.waitForURL('**/login', { timeout: 10000 });
  64 |       expect(page.url()).toContain('/login');
  65 |     });
  66 | 
  67 |     test('unauthenticated user redirected from /users to /login', async ({ page }) => {
  68 |       await page.goto('/users', { waitUntil: 'load' });
  69 |       await page.waitForURL('**/login', { timeout: 10000 });
  70 |       expect(page.url()).toContain('/login');
  71 |     });
  72 | 
  73 |     test('unauthenticated user redirected from /dataset to /login', async ({ page }) => {
  74 |       await page.goto('/dataset', { waitUntil: 'load' });
  75 |       await page.waitForURL('**/login', { timeout: 10000 });
  76 |       expect(page.url()).toContain('/login');
  77 |     });
  78 | 
  79 |     test('unauthenticated user redirected from /profile to /login', async ({ page }) => {
> 80 |       await page.goto('/profile', { waitUntil: 'load' });
     |                  ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  81 |       await page.waitForURL('**/login', { timeout: 10000 });
  82 |       expect(page.url()).toContain('/login');
  83 |     });
  84 |   });
  85 | });
```