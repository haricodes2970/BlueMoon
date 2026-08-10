import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { conversations } from "./conversations.js";
import { users } from "./users.js";

/**
 * A single text message within a conversation. `senderId` is
 * nullable with ON DELETE SET NULL (an attribution column, like
 * `blue_moon_tokens.consumed_by_user_id`) rather than CASCADE --
 * cascading would delete the *other* participant's message history
 * too if the sender's account were ever deleted, which is not this
 * user's data to lose. `conversationId` cascades because a message
 * row is genuinely owned by its conversation.
 *
 * Content is stored in plaintext -- End-to-End Encryption is
 * documented as required V1 scope (Product Blueprint, ROADMAP.md)
 * but is explicitly deferred out of Milestone 1.0, see
 * docs/adr/ADR-0029-message-encryption-deferred.md. Do not treat this
 * table as encrypted at rest.
 */
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("messages_conversation_id_created_at_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);
