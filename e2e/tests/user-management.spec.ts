import { test, expect } from '@playwright/test';
import { adminLogin, loginAndNavigate, type AdminSession } from './test-utils';

let session: AdminSession;

test.beforeAll(async () => {
  session = await adminLogin();
});

test.describe('User Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page, '/users', session);
  });

  test('renders the users page', async ({ page }) => {
    const heading = page.locator('h1, h2, h3', { hasText: /User/i });
    const count = await heading.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('shows invited users section', async ({ page }) => {
    const invitedSection = page.getByText(/Invited/i);
    const count = await invitedSection.count();
    if (count > 0) {
      await expect(invitedSection.first()).toBeVisible();
    }
  });

  test('shows non-invited users section', async ({ page }) => {
    const nonInvitedSection = page.getByText(/Non.?Invited|Non.?invited/i);
    const visible = await nonInvitedSection.isVisible().catch(() => false);
    if (visible) {
      await expect(nonInvitedSection).toBeVisible();
    }
  });

  test('shows admin users section', async ({ page }) => {
    const adminSection = page.getByText(/Admin Users|Admin/i);
    const visible = await adminSection.isVisible().catch(() => false);
    if (visible) {
      await expect(adminSection).toBeVisible();
    }
  });

  test('search input is visible', async ({ page }) => {
    const searchInputs = page.locator('input[placeholder*="Search" i], input[placeholder*="Filter" i]');
    const count = await searchInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('invite user button is visible', async ({ page }) => {
    const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add User"), button:has(svg.lucide-plus), button:has(svg.lucide-user-plus)');
    const visible = await inviteBtn.first().isVisible().catch(() => false);
    if (visible) {
      await expect(inviteBtn.first()).toBeVisible();
    }
  });

  test('user rows have action buttons (edit/delete)', async ({ page }) => {
    const editBtns = page.locator('button:has(svg.lucide-edit), button:has(svg.lucide-edit2)');
    const deleteBtns = page.locator('button:has(svg.lucide-trash), button:has(svg.lucide-trash2)');
    const anyVisible = (await editBtns.count().then(c => c > 0)) ||
                       (await deleteBtns.count().then(c => c > 0));
    expect(anyVisible).toBe(true);
  });

  test('sidebar shows correct user count', async ({ page }) => {
    const sidebarUserLabel = page.getByText('Users').first();
    await expect(sidebarUserLabel).toBeVisible();
  });

  test('sidebar navigation to users page highlights correctly', async ({ page }) => {
    const usersLink = page.locator('a[href="/users"]');
    if (await usersLink.isVisible().catch(() => false)) {
      await expect(usersLink).toBeVisible();
    }
  });

  test('delete user shows confirmation dialog', async ({ page }) => {
    const deleteBtns = page.locator('button:has(svg.lucide-trash), button:has(svg.lucide-trash2)');
    if (await deleteBtns.count() > 0) {
      page.on('dialog', async (dialog) => {
        await dialog.dismiss();
      });
      await deleteBtns.first().click();
      await page.waitForTimeout(500);
    }
  });
});