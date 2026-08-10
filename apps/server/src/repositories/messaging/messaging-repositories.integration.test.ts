import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { schema, type Database } from "@bluemoon/database";
import { eq } from "drizzle-orm";
import {
  createTestDatabase,
  hasTestDatabase,
  resetAllTables,
} from "../../test-utils/real-db.js";
import { createUserRepository } from "../identity/user.repository.js";
import { createConversationRepository } from "./conversation.repository.js";
import { createMessageRepository } from "./message.repository.js";
import { canonicalizePair } from "../../domain/messaging/entities/conversation.js";

/**
 * Milestone 1.0: the Messaging repositories exercised against a real
 * PostgreSQL instance, same pattern as
 * social-repositories.integration.test.ts (Milestone 0.9). Requires
 * TEST_DATABASE_URL or DATABASE_URL; skips entirely otherwise.
 */
describe.skipIf(!hasTestDatabase())(
  "Messaging repositories (real Postgres)",
  () => {
    let db: Database;

    beforeAll(() => {
      db = createTestDatabase();
    });

    beforeEach(async () => {
      await resetAllTables(db);
    });

    afterAll(async () => {
      await db.$client.end();
    });

    function shortId(): string {
      return randomUUID().replace(/-/g, "").slice(0, 12);
    }

    async function createTestUser(username = `u${shortId()}`) {
      const users = createUserRepository(db);
      return users.create({ username, credentialHash: "argon2id$fake-hash" });
    }

    describe("conversations", () => {
      it("findOrCreateForUsers creates a canonically-ordered row", async () => {
        const conversations = createConversationRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const [a, b] = canonicalizePair(userA.id, userB.id);

        const conversation = await conversations.findOrCreateForUsers(
          userB.id,
          userA.id,
        );

        expect(conversation.userAId).toBe(a);
        expect(conversation.userBId).toBe(b);
      });

      it("findOrCreateForUsers is idempotent", async () => {
        const conversations = createConversationRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();

        const first = await conversations.findOrCreateForUsers(
          userA.id,
          userB.id,
        );
        const second = await conversations.findOrCreateForUsers(
          userA.id,
          userB.id,
        );

        expect(second.id).toBe(first.id);
      });

      it("concurrent findOrCreateForUsers calls all resolve to the same row", async () => {
        const conversations = createConversationRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();

        const results = await Promise.all([
          conversations.findOrCreateForUsers(userA.id, userB.id),
          conversations.findOrCreateForUsers(userB.id, userA.id),
          conversations.findOrCreateForUsers(userA.id, userB.id),
        ]);

        const ids = new Set(results.map((c) => c.id));
        expect(ids.size).toBe(1);
      });

      it("rejects a self-conversation at the database level (check constraint)", async () => {
        const user = await createTestUser();

        await expect(
          db.insert(schema.conversations).values({
            id: randomUUID(),
            userAId: user.id,
            userBId: user.id,
          }),
        ).rejects.toThrow();
      });

      it("rejects a non-canonically-ordered pair at the database level (check constraint)", async () => {
        const userA = await createTestUser();
        const userB = await createTestUser();
        const [smaller, larger] = canonicalizePair(userA.id, userB.id);

        await expect(
          db.insert(schema.conversations).values({
            id: randomUUID(),
            userAId: larger,
            userBId: smaller,
          }),
        ).rejects.toThrow();
      });

      it("enforces unique(user_a_id, user_b_id)", async () => {
        const conversations = createConversationRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const [a, b] = canonicalizePair(userA.id, userB.id);
        await conversations.findOrCreateForUsers(userA.id, userB.id);

        await expect(
          db
            .insert(schema.conversations)
            .values({ id: randomUUID(), userAId: a, userBId: b }),
        ).rejects.toThrow();
      });

      it("lists conversations for either participant", async () => {
        const conversations = createConversationRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        await conversations.findOrCreateForUsers(userA.id, userB.id);

        expect(await conversations.listForUser(userA.id)).toHaveLength(1);
        expect(await conversations.listForUser(userB.id)).toHaveLength(1);
      });

      it("cascades on participant deletion", async () => {
        const conversations = createConversationRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const conversation = await conversations.findOrCreateForUsers(
          userA.id,
          userB.id,
        );

        await db.delete(schema.users).where(eq(schema.users.id, userA.id));

        expect(await conversations.findById(conversation.id)).toBeNull();
      });
    });

    describe("messages", () => {
      async function createConversationFor(userA: string, userB: string) {
        const conversations = createConversationRepository(db);
        return conversations.findOrCreateForUsers(userA, userB);
      }

      it("persists a message", async () => {
        const messages = createMessageRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const conversation = await createConversationFor(userA.id, userB.id);

        const message = await messages.create({
          conversationId: conversation.id,
          senderId: userA.id,
          content: "hello",
        });

        expect(message.content).toBe("hello");
        expect(message.senderId).toBe(userA.id);
      });

      it("rejects a message referencing a nonexistent conversation (FK constraint)", async () => {
        const messages = createMessageRepository(db);
        const userA = await createTestUser();

        await expect(
          messages.create({
            conversationId: randomUUID(),
            senderId: userA.id,
            content: "hello",
          }),
        ).rejects.toThrow();
      });

      it("cascades on conversation deletion", async () => {
        const messages = createMessageRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const conversation = await createConversationFor(userA.id, userB.id);
        await messages.create({
          conversationId: conversation.id,
          senderId: userA.id,
          content: "hello",
        });

        await db
          .delete(schema.conversations)
          .where(eq(schema.conversations.id, conversation.id));

        expect(
          await messages.listForConversation({
            conversationId: conversation.id,
            limit: 10,
          }),
        ).toHaveLength(0);
      });

      it("sets sender_id to null (not cascade) when the sender is deleted", async () => {
        const messages = createMessageRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const sender = await createTestUser();
        const conversation = await createConversationFor(userA.id, userB.id);
        // Inserted directly (not via the repository, which always
        // sets senderId to a real participant) so the sender's
        // eventual deletion can be isolated from the participant FKs'
        // CASCADE behavior -- this table's own schema doesn't require
        // sender_id to be a conversation participant.
        const message = await messages.create({
          conversationId: conversation.id,
          senderId: sender.id,
          content: "hello",
        });

        await db.delete(schema.users).where(eq(schema.users.id, sender.id));

        const remaining = await messages.listForConversation({
          conversationId: conversation.id,
          limit: 10,
        });
        expect(remaining).toHaveLength(1);
        expect(remaining[0]?.id).toBe(message.id);
        expect(remaining[0]?.senderId).toBeNull();
      });

      it("orders newest-first and paginates with `before`", async () => {
        const messages = createMessageRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const conversation = await createConversationFor(userA.id, userB.id);

        const created = [];
        for (const content of ["one", "two", "three"]) {
          created.push(
            await messages.create({
              conversationId: conversation.id,
              senderId: userA.id,
              content,
            }),
          );
          // Real Postgres timestamps have microsecond precision, but
          // guarantee strict ordering across statements regardless.
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        const firstPage = await messages.listForConversation({
          conversationId: conversation.id,
          limit: 2,
        });
        expect(firstPage.map((m) => m.content)).toEqual(["three", "two"]);

        const secondPage = await messages.listForConversation({
          conversationId: conversation.id,
          limit: 2,
          before: firstPage[firstPage.length - 1]!.createdAt,
        });
        expect(secondPage.map((m) => m.content)).toEqual(["one"]);
      });
    });
  },
);
