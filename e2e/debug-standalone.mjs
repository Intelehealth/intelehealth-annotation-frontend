import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';

const MOCK_USER = {
  _id: '507f1f77bcf86cd799439011',
  email: 'annotator@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'ANNOTATOR',
  status: 'ACTIVE',
  authProvider: 'local',
  isActive: true,
  invitedByAdmin: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function log(msg) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`);
}

async function setupApiMocks(page) {
  await page.route(`${API_URL}/auth/login`, async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }
    const postData = JSON.parse(request.postData() || '{}');
    log(`  mock login: email=${postData.email}`);
    if (postData.email === 'admin@example.com') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-admin-token',
          user: { ...MOCK_USER, email: 'admin@example.com', role: 'ADMIN' },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-token',
          user: { ...MOCK_USER, email: postData.email },
        }),
      });
    }
  });

  await page.route(`${API_URL}/users/profile`, async (route) => {
    log('  mock profile');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    });
  });

  await page.route(`${API_URL}/auth/heartbeat`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function main() {
  log('Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  log('Browser launched');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    baseURL: BASE_URL,
  });
  const page = await context.newPage();

  page.on('console', msg => log(`[browser:${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => log(`[browser:error] ${err.message}`));

  log('Setting up API mocks...');
  await setupApiMocks(page);
  log('API mocks registered');

  log(`Navigating to ${BASE_URL}/login ...`);
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  log('Page loaded (domcontentloaded)');

  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/debug-login.png' });
  log('Screenshot saved to /tmp/debug-login.png');

  const title = await page.title();
  log(`Page title: ${title}`);

  const bodyText = await page.locator('body').textContent();
  const visibleText = bodyText.substring(0, 500);
  log(`Body text (first 500 chars): ${visibleText}`);

  const emailInput = page.locator('#email');
  const emailExists = await emailInput.count();
  log(`Email input (#email) exists: ${emailExists > 0}`);

  const passwordInput = page.locator('#password');
  const passwordExists = await passwordInput.count();
  log(`Password input (#password) exists: ${passwordExists > 0}`);

  const signInButton = page.getByRole('button', { name: 'Sign In' });
  const signInCount = await signInButton.count();
  log(`Sign In button count: ${signInCount}`);

  if (emailExists > 0 && signInCount > 0) {
    log('Filling login form...');
    await emailInput.fill('annotator@example.com');
    await passwordInput.fill('password123');
    log('Form filled, clicking Sign In...');

    await signInButton.click();
    log('Clicked Sign In, waiting 3s for navigation...');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    log(`Current URL after login click: ${currentUrl}`);

    await page.screenshot({ path: '/tmp/debug-after-login.png' });
    log('Post-login screenshot saved');

    const bodyAfter = await page.locator('body').textContent();
    log(`Body text after login (first 500): ${bodyAfter.substring(0, 500)}`);
  } else {
    log('Form elements not found - cannot proceed with login test');
  }

  await browser.close();
  log('Browser closed - DONE');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
