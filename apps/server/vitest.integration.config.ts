import { defineConfig } from "vitest/config";

/**
 * Milestone 0.8 real-PostgreSQL integration tests. Separate from
 * vitest.config.ts so `pnpm test` never requires a live database.
 * Run explicitly via `pnpm test:db` with TEST_DATABASE_URL (or
 * DATABASE_URL) pointed at a disposable database -- see
 * docs/phases/Phase-0.8.md. Tests self-skip if neither is set.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    // Tests truncate shared tables between cases; running files/tests
    // concurrently against one database would race each other.
    fileParallelism: false,
  },
});
