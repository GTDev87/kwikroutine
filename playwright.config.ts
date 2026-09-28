import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    browserName: "chromium",
    channel: "chrome",
    baseURL: "http://localhost:8081",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:8081",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
