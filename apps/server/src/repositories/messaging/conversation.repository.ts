import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, eq, or } from "drizzle-orm";
import {
  canonicalizePair,
  type Conversation,
} from "../../domain/messaging/entities/conversation.js";

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByUsers(userId1: string, userId2: string): Promise<Conversation | null>;
  listForUser(userId: string): Promise<Conversation[]>;
  /**
   * Atomic get-or-create. Unlike Social's BlueMoon Token consumption
   * (where exactly one concurrent caller must win), every concurrent
   * caller here is expected to succeed and receive the identical row
   * -- starting a conversation is idempotent, not a race to guard
   * against. Same INSERT ... ON CONFLICT DO NOTHING + fallback SELECT
   * technique as FriendshipRepository.consumeTokenAndCreateFriendship,
   * applied for a different concurrency reason.
   */
  findOrCreateForUsers(userId1: string, userId2: string): Promise<Conversation>;
}

export function createConversationRepository(
  db: Database,
): ConversationRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByUsers(userId1, userId2) {
      const [a, b] = canonicalizePair(userId1, userId2);
      const [row] = await db
        .select()
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.userAId, a),
            eq(schema.conversations.userBId, b),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async listForUser(userId) {
      return db
        .select()
        .from(schema.conversations)
        .where(
          or(
            eq(schema.conversations.userAId, userId),
            eq(schema.conversations.userBId, userId),
          ),
        );
    },

    async findOrCreateForUsers(userId1, userId2) {
      const [a, b] = canonicalizePair(userId1, userId2);

      const [created] = await db
        .insert(schema.conversations)
        .values({ id: generateUuid(), userAId: a, userBId: b })
        .onConflictDoNothing()
        .returning();
      if (created) return created;

      const [existing] = await db
        .select()
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.userAId, a),
            eq(schema.conversations.userBId, b),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new Error(
          "Conversation insert conflicted but no existing row found",
        );
      }
      return existing;
    },
  };
}
