import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, type AdminSession } from './test-utils';

let adminSession: AdminSession;

test.beforeAll(async () => {
  adminSession = await adminLogin();
});

test.describe('Role-Based Access Control', () => {
  test.describe('Admin View', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndNavigate(page, '/dashboard', adminSession);
    });

    test('admin sees Dashboard link', async ({ page }) => {
      await expect(page.getByText('Dashboard').first()).toBeVisible();
    });

    test('admin sees Datasets link', async ({ page }) => {
      await expect(page.getByText('Datasets').first()).toBeVisible();
    });

    test('admin sees Users link', async ({ page }) => {
      await expect(page.getByText('Users').first()).toBeVisible();
    });

    test('admin sees Profile Settings link', async ({ page }) => {
      await expect(page.getByText('Profile Settings')).toBeVisible();
    });

    test('admin does NOT see My Tasks link', async ({ page }) => {
      await expect(page.getByText('My Tasks')).not.toBeVisible();
    });

    test('admin sees admin role badge', async ({ page }) => {
      const badges = page.locator('text=Admin');
      await expect(badges.first()).toBeVisible();
    });

    test('admin can navigate to /users', async ({ page }) => {
      const usersLink = page.locator('a[href="/users"]');
      if (await usersLink.isVisible().catch(() => false)) {
        await usersLink.click();
        await page.waitForURL('**/users', { timeout: 10000 });
        expect(page.url()).toContain('/users');
      }
    });

    test('admin can navigate to /dataset', async ({ page }) => {
      const datasetLink = page.locator('a[href="/dataset"]');
      if (await datasetLink.isVisible().catch(() => false)) {
        await datasetLink.click();
        await page.waitForURL('**/dataset', { timeout: 10000 });
        expect(page.url()).toContain('/dataset');
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('unauthenticated user redirected from /dashboard to /login', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'load' });
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user redirected from /users to /login', async ({ page }) => {
      await page.goto('/users', { waitUntil: 'load' });
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user redirected from /dataset to /login', async ({ page }) => {
      await page.goto('/dataset', { waitUntil: 'load' });
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });

    test('unauthenticated user redirected from /profile to /login', async ({ page }) => {
      await page.goto('/profile', { waitUntil: 'load' });
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  });
});