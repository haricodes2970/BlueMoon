import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey(),
    /** Raw submitted username, kept even when it doesn't resolve to a user. */
    usernameAttempted: varchar("username_attempted", { length: 64 }).notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    succeeded: boolean("succeeded").notNull(),
    reason: varchar("reason", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("login_attempts_username_created_idx").on(
      table.usernameAttempted,
      table.createdAt,
    ),
    index("login_attempts_ip_created_idx").on(table.ipAddress, table.createdAt),
    index("login_attempts_user_id_idx").on(table.userId),
  ],
);
