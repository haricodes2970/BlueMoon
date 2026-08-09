import { schema, type Database } from "@bluemoon/database";
import { generateUuid } from "@bluemoon/utils";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import {
  canonicalizePair,
  type Friendship,
} from "../../domain/social/entities/friendship.js";
import type { BlueMoonToken } from "../../domain/social/entities/blue-moon-token.js";

export interface FriendshipRepository {
  findById(id: string): Promise<Friendship | null>;
  findByUsers(userId1: string, userId2: string): Promise<Friendship | null>;
  listForUser(userId: string): Promise<Friendship[]>;
  remove(id: string): Promise<Friendship | null>;
  /**
   * Atomically redeems a BlueMoon Token and creates the resulting
   * friendship in one transaction. Deliberately lives here rather
   * than split across BlueMoonTokenRepository and this repository --
   * "consume the token" and "create the friendship" must succeed or
   * fail together, and the token-consumption step itself must be a
   * single conditional UPDATE (not a separate check-then-update) to
   * avoid the exact TOCTOU class of bug found and fixed in Milestone
   * 0.8 (see docs/security/Session-Management.md#concurrent-rotation-milestone-08).
   *
   * Returns `null` if the token doesn't exist, doesn't belong to
   * `ownerId`, is expired, or was already consumed -- the caller
   * can't distinguish which (see domain/social/errors.ts
   * BlueMoonTokenInvalidError). If the two users are already friends,
   * the token is still consumed (it was validly redeemed) but no
   * duplicate friendship row is created -- the existing one is
   * returned.
   */
  consumeTokenAndCreateFriendship(input: {
    tokenHash: string;
    ownerId: string;
    consumingUserId: string;
    now: Date;
  }): Promise<{
    token: BlueMoonToken;
    friendship: Friendship;
    alreadyFriends: boolean;
  } | null>;
}

export function createFriendshipRepository(db: Database): FriendshipRepository {
  return {
    async findById(id) {
      const [row] = await db
        .select()
        .from(schema.friendships)
        .where(eq(schema.friendships.id, id))
        .limit(1);
      return row ?? null;
    },

    async findByUsers(userId1, userId2) {
      const [a, b] = canonicalizePair(userId1, userId2);
      const [row] = await db
        .select()
        .from(schema.friendships)
        .where(
          and(
            eq(schema.friendships.userAId, a),
            eq(schema.friendships.userBId, b),
          ),
        )
        .limit(1);
      return row ?? null;
    },

    async listForUser(userId) {
      return db
        .select()
        .from(schema.friendships)
        .where(
          or(
            eq(schema.friendships.userAId, userId),
            eq(schema.friendships.userBId, userId),
          ),
        );
    },

    async remove(id) {
      const [row] = await db
        .delete(schema.friendships)
        .where(eq(schema.friendships.id, id))
        .returning();
      return row ?? null;
    },

    async consumeTokenAndCreateFriendship(input) {
      return db.transaction(async (tx) => {
        const [consumedToken] = await tx
          .update(schema.blueMoonTokens)
          .set({
            consumedAt: input.now,
            consumedByUserId: input.consumingUserId,
          })
          .where(
            and(
              eq(schema.blueMoonTokens.tokenHash, input.tokenHash),
              eq(schema.blueMoonTokens.ownerId, input.ownerId),
              isNull(schema.blueMoonTokens.consumedAt),
              gt(schema.blueMoonTokens.expiresAt, input.now),
            ),
          )
          .returning();

        if (!consumedToken) {
          return null;
        }

        const [userA, userB] = canonicalizePair(
          input.ownerId,
          input.consumingUserId,
        );

        const [createdFriendship] = await tx
          .insert(schema.friendships)
          .values({ id: generateUuid(), userAId: userA, userBId: userB })
          .onConflictDoNothing()
          .returning();

        if (createdFriendship) {
          return {
            token: consumedToken,
            friendship: createdFriendship,
            alreadyFriends: false,
          };
        }

        const [existingFriendship] = await tx
          .select()
          .from(schema.friendships)
          .where(
            and(
              eq(schema.friendships.userAId, userA),
              eq(schema.friendships.userBId, userB),
            ),
          )
          .limit(1);
        if (!existingFriendship) {
          throw new Error(
            "Friendship insert conflicted but no existing row found",
          );
        }

        return {
          token: consumedToken,
          friendship: existingFriendship,
          alreadyFriends: true,
        };
      });
    },
  };
}
