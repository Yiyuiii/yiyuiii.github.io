import { defineConfig } from "@playwright/test";

const browserChannel = process.env.CI ? undefined : "chrome";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.mjs",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.SITE_URL || "http://localhost:62091",
    ...(browserChannel ? { channel: browserChannel } : {}),
    headless: true,
    trace: "retain-on-failure",
  },
});
