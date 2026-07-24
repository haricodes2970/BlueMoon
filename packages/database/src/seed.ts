import { createDatabase } from "./client.js";

/**
 * Seed entry point. No business schema exists yet (Milestone 0.5 is
 * infrastructure-only) -- this wires up the connection/entry pattern
 * future seed data will follow, without seeding anything yet.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the seed script");
  }

  const db = createDatabase(connectionString);
  void db;

  console.log(
    "No seed data defined yet -- packages/database has no business schema (Milestone 0.5).",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
