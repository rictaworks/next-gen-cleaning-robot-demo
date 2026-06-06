import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../test/pr001",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  timeout: 30000,
});
