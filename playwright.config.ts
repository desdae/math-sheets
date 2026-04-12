import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4178",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command: "npm run dev --workspace backend",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
      env: {
        ...process.env,
        DOTENV_CONFIG_PATH: ".env.e2e"
      }
    },
    {
      command: "npm run dev --workspace frontend -- --host 127.0.0.1 --port 4178",
      url: "http://127.0.0.1:4178",
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_BASE_URL: "http://127.0.0.1:3001/api"
      }
    }
  ],
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
