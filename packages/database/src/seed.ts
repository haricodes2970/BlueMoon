import { createDatabase } from "./client.js";

/**
 * Seed entry point. Intentionally empty -- the Identity schema
 * (Milestone 0.6) has no seed data requirement, and future domains
 * should add their own seed steps here deliberately, not by default.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run the seed script");
  }

  const db = createDatabase(connectionString);
  void db;

  console.log("No seed data defined yet.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
