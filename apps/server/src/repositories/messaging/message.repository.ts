import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, desc, eq, lt } from "drizzle-orm";
import type { Message } from "../../domain/messaging/entities/message.js";

export interface MessageRepository {
  create(input: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<Message>;
  /**
   * Newest-first page of history, for "load older messages" scrolling.
   * `before` (exclusive) is a previously-seen message's `createdAt`,
   * so passing the last item of the prior page continues from there.
   * Ties at identical timestamps are not de-duplicated across a page
   * boundary -- an accepted, inconsequential edge case at this
   * table's timestamp precision, not worth a synthetic sequence
   * column for.
   */
  listForConversation(input: {
    conversationId: string;
    limit: number;
    before?: Date;
  }): Promise<Message[]>;
}

export function createMessageRepository(db: Database): MessageRepository {
  return {
    async create(input) {
      const [row] = await db
        .insert(schema.messages)
        .values({
          id: generateUuid(),
          conversationId: input.conversationId,
          senderId: input.senderId,
          content: input.content,
        })
        .returning();
      if (!row) {
        throw new Error("Message insert returned no row");
      }
      return row;
    },

    async listForConversation(input) {
      const conditions = [
        eq(schema.messages.conversationId, input.conversationId),
      ];
      if (input.before) {
        conditions.push(lt(schema.messages.createdAt, input.before));
      }

      return db
        .select()
        .from(schema.messages)
        .where(and(...conditions))
        .orderBy(desc(schema.messages.createdAt))
        .limit(input.limit);
    },
  };
}
