import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_events_user_id_created_idx").on(table.userId, table.createdAt),
    index("audit_events_event_type_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
  ],
);
