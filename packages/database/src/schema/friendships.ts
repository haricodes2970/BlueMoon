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
 * A persistent, symmetric connection between two BlueMoon accounts,
 * created only by successfully consuming a BlueMoon Token (see
 * `blue_moon_tokens`) -- never by username alone. Undirected: which
 * user is `userAId` vs `userBId` is a storage-canonicalization detail
 * (always the lexicographically smaller id), not a "requester" vs
 * "recipient" distinction -- enforced by the check constraint below,
 * which also rules out a user friending themselves. See
 * docs/database/Social-Schema.md.
 */
export const friendships = pgTable(
  "friendships",
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
    unique("friendships_user_pair_unique").on(table.userAId, table.userBId),
    index("friendships_user_a_id_idx").on(table.userAId),
    index("friendships_user_b_id_idx").on(table.userBId),
    check(
      "friendships_canonical_pair_order",
      sql`${table.userAId} < ${table.userBId}`,
    ),
  ],
);
