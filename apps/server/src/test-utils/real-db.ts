import { createDatabase, type Database } from "@bluemoon/database";

/**
 * Real-PostgreSQL test harness for Milestone 0.8 integration tests
 * (`*.integration.test.ts`). Deliberately separate from
 * `fake-identity-container.ts` -- these tests exercise the actual
 * Drizzle-backed repositories against a live database, not in-memory
 * fakes. See docs/phases/Phase-0.8.md.
 *
 * Reads `TEST_DATABASE_URL` first so a real dev/prod `DATABASE_URL`
 * is never accidentally reused as a test target; falls back to
 * `DATABASE_URL` for convenience (e.g. `docker-compose.yml`'s default
 * local instance, safe to truncate).
 */
export function getTestDatabaseUrl(): string | null {
  return process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? null;
}

export function hasTestDatabase(): boolean {
  return getTestDatabaseUrl() !== null;
}

export function createTestDatabase(): Database {
  const url = getTestDatabaseUrl();
  if (!url) {
    throw new Error(
      "No test database configured -- set TEST_DATABASE_URL or DATABASE_URL",
    );
  }
  return createDatabase(url);
}

/**
 * Truncates every Identity and Social table and restarts sequences.
 * `CASCADE` handles FK dependency order for us, so table order here
 * doesn't matter. Called between tests, not once per suite -- tests
 * must not depend on execution order.
 */
export async function resetAllTables(db: Database): Promise<void> {
  await db.execute(
    `TRUNCATE TABLE
      audit_events,
      login_attempts,
      refresh_tokens,
      sessions,
      trusted_devices,
      devices,
      blue_moon_tokens,
      messages,
      conversations,
      friendships,
      users
    RESTART IDENTITY CASCADE`,
  );
}
