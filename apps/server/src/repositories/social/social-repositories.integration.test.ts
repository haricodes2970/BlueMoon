import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { schema, type Database } from "@bluemoon/database";
import {
  createTestDatabase,
  hasTestDatabase,
  resetAllTables,
} from "../../test-utils/real-db.js";
import { createUserRepository } from "../identity/user.repository.js";
import { createBlueMoonTokenRepository } from "./blue-moon-token.repository.js";
import { createFriendshipRepository } from "./friendship.repository.js";
import { canonicalizePair } from "../../domain/social/entities/friendship.js";

/**
 * Milestone 0.9: the Social repositories exercised against a real
 * PostgreSQL instance, same pattern as
 * identity-repositories.integration.test.ts (Milestone 0.8). Requires
 * TEST_DATABASE_URL or DATABASE_URL; skips entirely otherwise.
 */
describe.skipIf(!hasTestDatabase())(
  "Social repositories (real Postgres)",
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

    describe("blue_moon_tokens", () => {
      it("persists a token owned by its creator", async () => {
        const tokens = createBlueMoonTokenRepository(db);
        const owner = await createTestUser();

        const token = await tokens.create({
          ownerId: owner.id,
          tokenHash: `hash-${shortId()}`,
          expiresAt: new Date(Date.now() + 300_000),
        });

        expect(token.ownerId).toBe(owner.id);
        expect(token.consumedAt).toBeNull();
      });

      it("rejects a token referencing a nonexistent owner (FK constraint)", async () => {
        const tokens = createBlueMoonTokenRepository(db);
        await expect(
          tokens.create({
            ownerId: randomUUID(),
            tokenHash: `hash-${shortId()}`,
            expiresAt: new Date(Date.now() + 300_000),
          }),
        ).rejects.toThrow();
      });

      it("enforces unique(token_hash)", async () => {
        const tokens = createBlueMoonTokenRepository(db);
        const owner = await createTestUser();
        const tokenHash = `hash-${shortId()}`;

        await tokens.create({
          ownerId: owner.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 300_000),
        });

        await expect(
          tokens.create({
            ownerId: owner.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 300_000),
          }),
        ).rejects.toThrow();
      });
    });

    describe("friendships", () => {
      it("enforces unique(user_a_id, user_b_id) regardless of insert order", async () => {
        const friendships = createFriendshipRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const [a, b] = canonicalizePair(userA.id, userB.id);

        await db
          .insert(schema.friendships)
          .values({ id: randomUUID(), userAId: a, userBId: b });

        await expect(
          friendships.findByUsers(userA.id, userB.id),
        ).resolves.toMatchObject({ userAId: a, userBId: b });
      });

      it("rejects a self-friendship at the database level (check constraint)", async () => {
        const user = await createTestUser();

        await expect(
          db.insert(schema.friendships).values({
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
          db.insert(schema.friendships).values({
            id: randomUUID(),
            userAId: larger,
            userBId: smaller,
          }),
        ).rejects.toThrow();
      });

      it("lists friendships for either participant", async () => {
        const friendships = createFriendshipRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const [a, b] = canonicalizePair(userA.id, userB.id);
        await db
          .insert(schema.friendships)
          .values({ id: randomUUID(), userAId: a, userBId: b });

        expect(await friendships.listForUser(userA.id)).toHaveLength(1);
        expect(await friendships.listForUser(userB.id)).toHaveLength(1);
      });

      it("removes a friendship", async () => {
        const friendships = createFriendshipRepository(db);
        const userA = await createTestUser();
        const userB = await createTestUser();
        const [a, b] = canonicalizePair(userA.id, userB.id);
        const [row] = await db
          .insert(schema.friendships)
          .values({ id: randomUUID(), userAId: a, userBId: b })
          .returning();

        expect(await friendships.remove(row!.id)).toMatchObject({
          id: row!.id,
        });
        expect(await friendships.findById(row!.id)).toBeNull();
      });
    });

    describe("consumeTokenAndCreateFriendship", () => {
      async function setupOwnerAndToken(expiresInMs = 300_000) {
        const owner = await createTestUser();
        const tokens = createBlueMoonTokenRepository(db);
        const tokenHash = `hash-${shortId()}`;
        await tokens.create({
          ownerId: owner.id,
          tokenHash,
          expiresAt: new Date(Date.now() + expiresInMs),
        });
        return { owner, tokenHash };
      }

      it("consuming a valid token creates a friendship", async () => {
        const friendships = createFriendshipRepository(db);
        const { owner, tokenHash } = await setupOwnerAndToken();
        const consumer = await createTestUser();

        const result = await friendships.consumeTokenAndCreateFriendship({
          tokenHash,
          ownerId: owner.id,
          consumingUserId: consumer.id,
          now: new Date(),
        });

        expect(result).not.toBeNull();
        expect(result?.alreadyFriends).toBe(false);
        expect(
          await friendships.findByUsers(owner.id, consumer.id),
        ).toMatchObject({ id: result?.friendship.id });
      });

      it("rejects an expired token", async () => {
        const friendships = createFriendshipRepository(db);
        const { owner, tokenHash } = await setupOwnerAndToken(-1000);
        const consumer = await createTestUser();

        const result = await friendships.consumeTokenAndCreateFriendship({
          tokenHash,
          ownerId: owner.id,
          consumingUserId: consumer.id,
          now: new Date(),
        });

        expect(result).toBeNull();
      });

      it("rejects a token presented for the wrong owner", async () => {
        const friendships = createFriendshipRepository(db);
        const { tokenHash } = await setupOwnerAndToken();
        const wrongOwner = await createTestUser();
        const consumer = await createTestUser();

        const result = await friendships.consumeTokenAndCreateFriendship({
          tokenHash,
          ownerId: wrongOwner.id,
          consumingUserId: consumer.id,
          now: new Date(),
        });

        expect(result).toBeNull();
      });

      it("is idempotent when the two users are already friends -- token is still consumed", async () => {
        const friendships = createFriendshipRepository(db);
        const owner = await createTestUser();
        const consumer = await createTestUser();
        const tokens = createBlueMoonTokenRepository(db);

        const firstHash = `hash-${shortId()}`;
        await tokens.create({
          ownerId: owner.id,
          tokenHash: firstHash,
          expiresAt: new Date(Date.now() + 300_000),
        });
        const first = await friendships.consumeTokenAndCreateFriendship({
          tokenHash: firstHash,
          ownerId: owner.id,
          consumingUserId: consumer.id,
          now: new Date(),
        });
        expect(first?.alreadyFriends).toBe(false);

        const secondHash = `hash-${shortId()}`;
        await tokens.create({
          ownerId: owner.id,
          tokenHash: secondHash,
          expiresAt: new Date(Date.now() + 300_000),
        });
        const second = await friendships.consumeTokenAndCreateFriendship({
          tokenHash: secondHash,
          ownerId: owner.id,
          consumingUserId: consumer.id,
          now: new Date(),
        });

        expect(second).not.toBeNull();
        expect(second?.alreadyFriends).toBe(true);
        expect(second?.friendship.id).toBe(first?.friendship.id);
        expect(await friendships.listForUser(consumer.id)).toHaveLength(1);
      });

      it("consuming the same token twice: the second attempt fails (single-use)", async () => {
        const friendships = createFriendshipRepository(db);
        const { owner, tokenHash } = await setupOwnerAndToken();
        const consumerA = await createTestUser();
        const consumerB = await createTestUser();

        const first = await friendships.consumeTokenAndCreateFriendship({
          tokenHash,
          ownerId: owner.id,
          consumingUserId: consumerA.id,
          now: new Date(),
        });
        const second = await friendships.consumeTokenAndCreateFriendship({
          tokenHash,
          ownerId: owner.id,
          consumingUserId: consumerB.id,
          now: new Date(),
        });

        expect(first).not.toBeNull();
        expect(second).toBeNull();
      });

      it("concurrent consumption of the same token: exactly one succeeds", async () => {
        const friendships = createFriendshipRepository(db);
        const { owner, tokenHash } = await setupOwnerAndToken();
        const consumerA = await createTestUser();
        const consumerB = await createTestUser();

        const [resultA, resultB] = await Promise.all([
          friendships.consumeTokenAndCreateFriendship({
            tokenHash,
            ownerId: owner.id,
            consumingUserId: consumerA.id,
            now: new Date(),
          }),
          friendships.consumeTokenAndCreateFriendship({
            tokenHash,
            ownerId: owner.id,
            consumingUserId: consumerB.id,
            now: new Date(),
          }),
        ]);

        const results = [resultA, resultB];
        const winners = results.filter((r) => r !== null);
        const losers = results.filter((r) => r === null);
        expect(winners).toHaveLength(1);
        expect(losers).toHaveLength(1);
      });
    });
  },
);
