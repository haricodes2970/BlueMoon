import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // drizzle-kit's own loader can't resolve this project's ".js"-extension
  // relative imports across multiple TS source files -- point it at the
  // compiled output instead (see docs/database/Identity-Schema.md).
  schema: "./dist/schema/index.js",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
