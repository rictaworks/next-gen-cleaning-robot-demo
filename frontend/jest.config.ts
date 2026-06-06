import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: { "^.+\\.(ts|tsx)$": "ts-jest" },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  passWithNoTests: true,
};

export default config;
