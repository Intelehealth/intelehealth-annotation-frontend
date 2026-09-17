# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\tests\auth.spec.ts >> Login Page >> toggles password visibility
- Location: e2e\tests\auth.spec.ts:32:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Login Page', () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto('/login', { waitUntil: 'load' });
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6   |     await page.getByRole('heading', { name: 'Welcome Back' }).waitFor({ state: 'visible', timeout: 15000 });
  7   |   });
  8   | 
  9   |   test('renders login form with all elements', async ({ page }) => {
  10  |     await expect(page.getByText('Welcome Back')).toBeVisible();
  11  |     await expect(page.getByText('Sign in to your account')).toBeVisible();
  12  |     await expect(page.getByLabel('Email Address')).toBeVisible();
  13  |     await expect(page.locator('#password')).toBeVisible();
  14  |     await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  15  |     await expect(page.getByText('Forgot password?')).toBeVisible();
  16  |     await expect(page.getByText('Create Account')).toBeVisible();
  17  |   });
  18  | 
  19  |   test('shows validation errors for empty fields', async ({ page }) => {
  20  |     await page.getByRole('button', { name: 'Sign In' }).click();
  21  |     await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  22  |     await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  23  |   });
  24  | 
  25  |   test('shows validation error for invalid email', async ({ page }) => {
  26  |     await page.getByLabel('Email Address').fill('notanemail');
  27  |     await page.locator('#password').fill('password123');
  28  |     await page.getByRole('button', { name: 'Sign In' }).click();
  29  |     await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  30  |   });
  31  | 
  32  |   test('toggles password visibility', async ({ page }) => {
  33  |     const passwordInput = page.locator('#password');
  34  |     await passwordInput.fill('visibletest');
  35  |     await expect(passwordInput).toHaveAttribute('type', 'password');
  36  |     await page.getByRole('button', { name: 'Show password' }).click();
  37  |     await expect(passwordInput).toHaveAttribute('type', 'text');
  38  |     await page.getByRole('button', { name: 'Hide password' }).click();
  39  |     await expect(passwordInput).toHaveAttribute('type', 'password');
  40  |   });
  41  | 
  42  |   test('navigates to forgot-password page via link', async ({ page }) => {
  43  |     await page.getByText('Forgot password?').click();
  44  |     await page.waitForURL('**/forgot-password');
  45  |     expect(page.url()).toContain('/forgot-password');
  46  |   });
  47  | 
  48  |   test('navigates to signup mode and back', async ({ page }) => {
  49  |     await page.getByText('Create Account').click();
  50  |     await expect(page.getByText('Create your account')).toBeVisible();
  51  |     await expect(page.getByLabel('First name')).toBeVisible();
  52  |     await expect(page.getByLabel('Last name')).toBeVisible();
  53  |     await page.getByText('Sign in here').click();
  54  |     await expect(page.getByText('Welcome Back')).toBeVisible();
  55  |   });
  56  | 
  57  |   test('shows Google OAuth button on login', async ({ page }) => {
  58  |     const googleBtn = page.getByRole('button', { name: /continue with google/i });
  59  |     await expect(googleBtn).toBeVisible();
  60  |   });
  61  | });
  62  | 
  63  | test.describe('Signup Mode', () => {
  64  |   test.beforeEach(async ({ page }) => {
  65  |     await page.goto('/login?mode=signup', { waitUntil: 'load' });
  66  |     // wait until client JS hydrates and switches to signup mode
  67  |     await page.waitForFunction(() => {
  68  |       const h3 = document.querySelector('h3');
  69  |       return h3 && h3.textContent === 'Create your account';
  70  |     }, { timeout: 20000 });
  71  |   });
  72  | 
  73  |   test('renders signup form with all fields', async ({ page }) => {
  74  |     await expect(page.getByText('Create your account')).toBeVisible();
  75  |     await expect(page.getByLabel('First name')).toBeVisible();
  76  |     await expect(page.getByLabel('Last name')).toBeVisible();
  77  |     await expect(page.getByLabel('Email Address')).toBeVisible();
  78  |     await expect(page.locator('#signup-password')).toBeVisible();
  79  |     await expect(page.locator('#confirmPassword')).toBeVisible();
  80  |     await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  81  |   });
  82  | 
  83  |   test('shows validation errors for empty signup fields', async ({ page }) => {
  84  |     await page.getByRole('button', { name: 'Create Account' }).click();
  85  |     await expect(page.getByText('First name must be at least 2 characters')).toBeVisible();
  86  |     await expect(page.getByText('Last name must be at least 2 characters')).toBeVisible();
  87  |     await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  88  |     await expect(page.getByText('Password must be at least 6 characters')).toBeVisible();
  89  |   });
  90  | 
  91  |   test('shows error when passwords do not match', async ({ page }) => {
  92  |     await page.getByLabel('First name').fill('Jane');
  93  |     await page.getByLabel('Last name').fill('Smith');
  94  |     await page.getByLabel('Email Address').fill('jane@example.com');
  95  |     await page.locator('#signup-password').fill('password123');
  96  |     await page.locator('#confirmPassword').fill('differentpassword');
  97  |     await page.getByRole('button', { name: 'Create Account' }).click();
  98  |     await expect(page.getByText("Passwords don't match")).toBeVisible();
  99  |   });
  100 | 
  101 |   test('show password toggle on signup fields', async ({ page }) => {
  102 |     const toggleBtns = page.getByRole('button', { name: /show password/i });
  103 |     const count = await toggleBtns.count();
  104 |     expect(count).toBeGreaterThanOrEqual(1);
  105 |   });
```