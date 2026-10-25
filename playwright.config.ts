import { defineConfig, devices } from '@playwright/test';
import { E2E_ACCOUNT } from './e2e/test-account';

const applicationUrl = 'http://127.0.0.1:4202';
const apiUrl = 'http://127.0.0.1:5092';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: applicationUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'ChurchServe API',
      command:
        'dotnet run --project server/ChurchServe.Api --no-launch-profile -- --urls http://127.0.0.1:5092',
      url: `${apiUrl}/api/session`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Testing',
        ConnectionStrings__ChurchServe: 'Data Source=.churchserve.e2e.db',
        Authentication__LocalAccount__Id: E2E_ACCOUNT.id,
        Authentication__LocalAccount__Email: E2E_ACCOUNT.email,
        Authentication__LocalAccount__DisplayName: E2E_ACCOUNT.displayName,
        Authentication__LocalAccount__Password: E2E_ACCOUNT.password,
        Authentication__LocalAccount__Role: 'scheduler',
      },
    },
    {
      name: 'ChurchServe Angular',
      command: 'npm start -- --host 127.0.0.1 --port 4202 --proxy-config e2e/proxy.conf.json',
      url: applicationUrl,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
