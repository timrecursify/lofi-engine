import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI 
    ? [['html'], ['junit', { outputFile: 'test-results/e2e-junit.xml' }]]
    : [['html'], ['list']],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_URL || 'http://localhost:4173',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Timeout for individual actions */
    actionTimeout: 15000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Chromium
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'tests/auth/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    // Firefox
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/auth/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    // WebKit (Safari)
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/auth/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    /* Mobile testing */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/auth/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'tests/auth/.auth/user.json'
      },
      dependencies: ['setup'],
    },

    /* Smoke tests for production validation */
    {
      name: 'smoke-tests',
      testDir: './tests/smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.TEST_URL || 'https://chillcast.fm'
      }
    }
  ],

  /* Global test timeout */
  timeout: 30000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000
  },

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run build && npm run preview',
    port: 4173,
    timeout: 120000,
    reuseExistingServer: !process.env.CI
  },
  
  /* Output directory for test artifacts */
  outputDir: 'test-results/',
  
  /* Global setup and teardown */
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts'
}); 