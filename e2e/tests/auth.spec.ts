import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'load' });
    await page.getByRole('heading', { name: 'Welcome Back' }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('renders login form with all elements', async ({ page }) => {
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.getByLabel('Email Address').fill('notanemail');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await passwordInput.fill('visibletest');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('navigates to forgot-password page via link', async ({ page }) => {
    await page.getByText('Forgot password?').click();
    await page.waitForURL('**/forgot-password');
    expect(page.url()).toContain('/forgot-password');
  });

  test('navigates to signup mode and back', async ({ page }) => {
    await page.getByText('Create Account').click();
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await page.getByText('Sign in here').click();
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('shows Google OAuth button on login', async ({ page }) => {
    const googleBtn = page.getByRole('button', { name: /continue with google/i });
    await expect(googleBtn).toBeVisible();
  });
});

test.describe('Signup Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login?mode=signup', { waitUntil: 'load' });
    // wait until client JS hydrates and switches to signup mode
    await page.waitForFunction(() => {
      const h3 = document.querySelector('h3');
      return h3 && h3.textContent === 'Create your account';
    }, { timeout: 20000 });
  });

  test('renders signup form with all fields', async ({ page }) => {
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByLabel('First name')).toBeVisible();
    await expect(page.getByLabel('Last name')).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
    await expect(page.locator('#signup-password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('shows validation errors for empty signup fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText('First name must be at least 2 characters')).toBeVisible();
    await expect(page.getByText('Last name must be at least 2 characters')).toBeVisible();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel('First name').fill('Jane');
    await page.getByLabel('Last name').fill('Smith');
    await page.getByLabel('Email Address').fill('jane@example.com');
    await page.locator('#signup-password').fill('password123');
    await page.locator('#confirmPassword').fill('differentpassword');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test('show password toggle on signup fields', async ({ page }) => {
    const toggleBtns = page.getByRole('button', { name: /show password/i });
    const count = await toggleBtns.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Admin Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin-login', { waitUntil: 'load' });
    await page.getByRole('heading', { name: 'Admin Sign In' }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('renders admin login form', async ({ page }) => {
    await expect(page.getByText('Admin Sign In')).toBeVisible();
    await expect(page.getByText('Admin Portal')).toBeVisible();
    await expect(page.getByLabel('Admin Email Address')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In as Admin' })).toBeVisible();
  });

  test('shows validation errors for empty admin login fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In as Admin' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  });

  test('links to regular sign in', async ({ page }) => {
    await expect(page.getByText('Regular sign in')).toBeVisible();
    await page.getByText('Regular sign in').click();
    await page.waitForURL('**/login', { timeout: 30000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Forgot Password Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'load' });
    await page.getByRole('heading', { name: 'Forgot password?' }).waitFor({ state: 'visible', timeout: 15000 });
  });

  test('renders forgot password form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByLabel('Email Address')).toBeVisible();
  });

  test('submits email to forgot password endpoint', async ({ page }) => {
    await page.getByLabel('Email Address').fill('user@example.com');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await page.waitForTimeout(2000);
  });
});

test.describe('Protected Routes', () => {
  test('redirects unauthenticated user from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'load' });
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated user from profile to login', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'load' });
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated user from users to login', async ({ page }) => {
    await page.goto('/users', { waitUntil: 'load' });
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated user from dataset to login', async ({ page }) => {
    await page.goto('/dataset', { waitUntil: 'load' });
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});
