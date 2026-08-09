import { randomUUID } from "node:crypto";
import type { SocialContainer } from "../social-container.js";
import type { UserRepository } from "../repositories/identity/user.repository.js";
import type { BlueMoonTokenRepository } from "../repositories/social/blue-moon-token.repository.js";
import type { FriendshipRepository } from "../repositories/social/friendship.repository.js";
import type { BlueMoonToken } from "../domain/social/entities/blue-moon-token.js";
import type { Friendship } from "../domain/social/entities/friendship.js";
import { canonicalizePair } from "../domain/social/entities/friendship.js";
import type { SocialAuditEvent } from "../events/social-events.js";
import { createGenerateBlueMoonTokenUseCase } from "../services/social/generate-token.service.js";
import { createConsumeBlueMoonTokenUseCase } from "../services/social/consume-token.service.js";
import { createListFriendshipsUseCase } from "../services/social/list-friendships.service.js";
import { createRemoveFriendshipUseCase } from "../services/social/remove-friendship.service.js";

/**
 * In-memory fake, same shape as fake-identity-container.ts. Takes the
 * caller's existing UserRepository (from fake-identity-container.ts's
 * `container.users`) rather than constructing its own -- Social
 * doesn't own the User concept, and a real HTTP test needs users
 * registered via the Identity fake to be the same users Social's
 * consume flow resolves by username.
 */
export function createFakeSocialContainer(users: UserRepository): {
  container: SocialContainer;
  auditEvents: SocialAuditEvent[];
} {
  const tokens = new Map<string, BlueMoonToken>();
  const friendships = new Map<string, Friendship>();
  const auditEvents: SocialAuditEvent[] = [];

  const blueMoonTokens: BlueMoonTokenRepository = {
    async create(input) {
      const token: BlueMoonToken = {
        id: randomUUID(),
        ownerId: input.ownerId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        consumedAt: null,
        consumedByUserId: null,
        createdAt: new Date(),
      };
      tokens.set(token.id, token);
      return token;
    },
  };

  const friendshipsRepo: FriendshipRepository = {
    async findById(id) {
      return friendships.get(id) ?? null;
    },
    async findByUsers(userId1, userId2) {
      const [a, b] = canonicalizePair(userId1, userId2);
      return (
        [...friendships.values()].find(
          (f) => f.userAId === a && f.userBId === b,
        ) ?? null
      );
    },
    async listForUser(userId) {
      return [...friendships.values()].filter(
        (f) => f.userAId === userId || f.userBId === userId,
      );
    },
    async remove(id) {
      const friendship = friendships.get(id) ?? null;
      if (friendship) friendships.delete(id);
      return friendship;
    },
    async consumeTokenAndCreateFriendship(input) {
      const token = [...tokens.values()].find(
        (t) =>
          t.tokenHash === input.tokenHash &&
          t.ownerId === input.ownerId &&
          t.consumedAt === null &&
          t.expiresAt.getTime() > input.now.getTime(),
      );
      if (!token) return null;

      token.consumedAt = input.now;
      token.consumedByUserId = input.consumingUserId;

      const [a, b] = canonicalizePair(input.ownerId, input.consumingUserId);
      const existing = [...friendships.values()].find(
        (f) => f.userAId === a && f.userBId === b,
      );
      if (existing) {
        return { token, friendship: existing, alreadyFriends: true };
      }

      const friendship: Friendship = {
        id: randomUUID(),
        userAId: a,
        userBId: b,
        createdAt: new Date(),
      };
      friendships.set(friendship.id, friendship);
      return { token, friendship, alreadyFriends: false };
    },
  };

  const audit = {
    async record(event: SocialAuditEvent) {
      auditEvents.push(event);
    },
  };

  const container: SocialContainer = {
    generateBlueMoonToken: createGenerateBlueMoonTokenUseCase({
      blueMoonTokens,
      audit,
    }),
    consumeBlueMoonToken: createConsumeBlueMoonTokenUseCase({
      users,
      friendships: friendshipsRepo,
      audit,
    }),
    listFriendships: createListFriendshipsUseCase({
      friendships: friendshipsRepo,
      users,
    }),
    removeFriendship: createRemoveFriendshipUseCase({
      friendships: friendshipsRepo,
      audit,
    }),
  };

  return { container, auditEvents };
}
