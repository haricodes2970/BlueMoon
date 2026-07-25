import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { devices } from "./devices.js";
import { users } from "./users.js";

/**
 * A device trust grant ("remember this device"), separate from the
 * device record itself so trust can be granted/expired/revoked
 * independently and multiple times over a device's lifetime.
 */
export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    trustedAt: timestamp("trusted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("trusted_devices_user_id_idx").on(table.userId),
    index("trusted_devices_device_id_idx").on(table.deviceId),
  ],
);
