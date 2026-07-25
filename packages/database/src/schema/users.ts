import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Platform identity accounts. Unrelated to PINChat's ephemeral
 * session join-code -- this is the persistent BlueMoon account a
 * user registers once and reuses across every future product.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: varchar("username", { length: 20 }).notNull().unique(),
  credentialHash: text("credential_hash").notNull(),
  credentialUpdatedAt: timestamp("credential_updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
