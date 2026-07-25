import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { devices } from "./devices.js";
import { users } from "./users.js";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Absolute maximum lifetime cutoff -- see docs/security/Session-Management.md. */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_device_id_idx").on(table.deviceId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);
