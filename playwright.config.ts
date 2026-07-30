import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      cwd: '/mnt/d/smirthi project/Annotation project/annotation-platform-frontend',
    },
    {
      command: 'node dist/main.js',
      url: 'http://localhost:4000/api',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      cwd: '/mnt/d/smirthi project/Annotation project/annotation-platform-backend',
    },
  ],
});
