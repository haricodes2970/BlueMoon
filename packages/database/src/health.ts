import type { Database } from "./client.js";

/**
 * Cheap connectivity check for the health endpoint. Returns false
 * instead of throwing so callers can report "degraded" rather than
 * crash when the database is unreachable (see Backend-Architecture.md
 * health check requirements).
 */
export async function checkDatabaseConnection(db: Database): Promise<boolean> {
  try {
    await db.execute("select 1");
    return true;
  } catch {
    return false;
  }
}
