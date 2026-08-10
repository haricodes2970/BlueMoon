import {
  check,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

/**
 * A persistent 1:1 PINChat conversation between two BlueMoon
 * accounts. Same canonical-pair storage pattern as `friendships`
 * (always the lexicographically smaller id first, enforced by the
 * check constraint below, which also rules out a user starting a
 * conversation with themselves) -- undirected, duplicate-proof via
 * the unique pair constraint. Creation is gated on an existing
 * Friendship at the application layer (see
 * services/messaging/get-or-create-conversation.service.ts); this
 * table has no FK to `friendships` because a conversation is meant to
 * outlive the friendship that started it -- see
 * docs/database/Messaging-Schema.md.
 */
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("conversations_user_pair_unique").on(table.userAId, table.userBId),
    index("conversations_user_a_id_idx").on(table.userAId),
    index("conversations_user_b_id_idx").on(table.userBId),
    check(
      "conversations_canonical_pair_order",
      sql`${table.userAId} < ${table.userBId}`,
    ),
  ],
);
