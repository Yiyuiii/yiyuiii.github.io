import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  workers: process.env.CI ? 4 : 2,
  reporter: "line",
  use: {
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    channel: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
});
