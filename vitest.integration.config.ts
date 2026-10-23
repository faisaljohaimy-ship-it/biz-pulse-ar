/**
 * Integration tier — real Postgres 16 + PostgREST + gateway, real
 * `@supabase/supabase-js`, real runtime code; only the language model is
 * scripted. Separate from vitest.config.ts so `npm test` stays mocked-only
 * and never needs a database.
 *
 *   npm run integration:up && npm run test:integration && npm run integration:down
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/integration/**/*.integration.test.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup-env.ts"],
    // One database, one file at a time: the suites share fixtures and order.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    css: false,
  },
});
