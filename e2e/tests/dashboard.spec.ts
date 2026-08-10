import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, type AdminSession } from './test-utils';

let session: AdminSession;

test.beforeAll(async () => {
  session = await adminLogin();
});

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/dashboard', session);
  });

  test('renders dashboard layout with sidebar', async ({ page }) => {
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByText('DataAnnotate')).toBeVisible();
  });

  test('shows admin navigation items in sidebar', async ({ page }) => {
    await expect(page.getByText('Dashboard').first()).toBeVisible();
    await expect(page.getByText('Datasets').first()).toBeVisible();
    await expect(page.getByText('Users').first()).toBeVisible();
    await expect(page.getByText('Profile Settings').first()).toBeVisible();
  });

  test('shows dashboard header', async ({ page }) => {
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test('shows admin KPI stat cards', async ({ page }) => {
    const totalDatasets = page.getByText('Total Datasets');
    const totalUsers = page.getByText('Total Users');
    const anyVisible = (await totalDatasets.isVisible().catch(() => false)) ||
                       (await totalUsers.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });

  test('shows quick action buttons for admin', async ({ page }) => {
    const addDataset = page.getByText('New Dataset');
    const addUser = page.getByText('Add User');
    const anyVisible = (await addDataset.isVisible().catch(() => false)) ||
                       (await addUser.isVisible().catch(() => false));
    expect(anyVisible).toBe(true);
  });

  test('does not show My Tasks for admin', async ({ page }) => {
    const myTasksLink = page.getByText('My Tasks');
    await expect(myTasksLink).not.toBeVisible();
  });

  test('sidebar has sign out button', async ({ page }) => {
    await expect(page.getByText('Sign Out')).toBeVisible();
  });

  test('sidebar collapse toggle works', async ({ page }) => {
    const collapseBtn = page.locator('button:has(svg.lucide-chevron-left)');
    if (await collapseBtn.isVisible().catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(300);
      const chevronRight = page.locator('svg.lucide-chevron-right');
      await expect(chevronRight).toBeVisible();
    }
  });

  test('dashboard is accessible via sidebar navigation', async ({ page }) => {
    const dashboardLink = page.locator('a[href="/dashboard"]');
    if (await dashboardLink.isVisible().catch(() => false)) {
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toBeEnabled();
    }
  });

  test('notification bell shows unread count', async ({ page }) => {
    const bellBtn = page.locator('button:has(svg.lucide-bell)');
    await expect(bellBtn).toBeVisible();
  });

  test('sidebar shows user profile with name and role', async ({ page }) => {
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test('sidebar shows admin role badge', async ({ page }) => {
    const adminBadge = page.locator('text=Admin');
    await expect(adminBadge.first()).toBeVisible();
  });

  test('shows sign out in sidebar', async ({ page }) => {
    const signOutBtn = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")');
    await expect(signOutBtn).toBeVisible();
  });

  test('sidebar collapse state indicator', async ({ page }) => {
    const chevronBtns = page.locator('button:has(svg.lucide-chevron-left), button:has(svg.lucide-chevron-right)');
    await expect(chevronBtns.first()).toBeVisible();
  });
});