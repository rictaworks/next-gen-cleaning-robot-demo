import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["../test/pr002/**/*.test.ts"],
  },
});
