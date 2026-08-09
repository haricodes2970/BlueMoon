import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Real-Postgres tests (Milestone 0.8) run only via `pnpm test:db` --
    // see vitest.integration.config.ts -- so `pnpm test` stays
    // database-free and safe to run in CI without a Postgres service.
    exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
  },
});
