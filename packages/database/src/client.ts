import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Database = ReturnType<typeof createDatabase>;

/** Creates a Drizzle client backed by a single postgres.js connection pool. */
export function createDatabase(connectionString: string) {
  const queryClient = postgres(connectionString);
  return drizzle(queryClient, { schema });
}
