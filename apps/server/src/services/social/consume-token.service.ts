import {
  BlueMoonTokenInvalidError,
  CannotFriendSelfError,
} from "../../domain/social/errors.js";
import { hashBlueMoonToken } from "../../infrastructure/social/blue-moon-token.js";
import type { SocialAuditWriter } from "../../infrastructure/social/audit-writer.js";
import type { FriendshipRepository } from "../../repositories/social/friendship.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";
import { toPublicFriendship, type PublicFriendship } from "./dto.js";

export interface ConsumeBlueMoonTokenDependencies {
  users: UserRepository;
  friendships: FriendshipRepository;
  audit: SocialAuditWriter;
  now?: () => Date;
}

export interface ConsumeBlueMoonTokenInput {
  /** The token owner's username -- required alongside the token itself. */
  username: string;
  token: string;
  consumingUserId: string;
  ipAddress: string;
}

/**
 * "Username + BlueMoon Token" is the only way a friendship is ever
 * created -- there is no code path that creates one from a username
 * alone. The target user, the token's existence/ownership, its
 * expiry, and its single-use state are all folded into one generic
 * error (BlueMoonTokenInvalidError) so this endpoint can't be used to
 * enumerate usernames or probe token state, mirroring
 * domain/identity's login anti-enumeration pattern.
 */
export function createConsumeBlueMoonTokenUseCase(
  deps: ConsumeBlueMoonTokenDependencies,
) {
  const now = deps.now ?? (() => new Date());

  return async function consumeBlueMoonToken(
    input: ConsumeBlueMoonTokenInput,
  ): Promise<PublicFriendship> {
    const usernameNormalized = input.username.trim().toLowerCase();
    const owner = await deps.users.findByUsername(usernameNormalized);

    if (!owner) {
      await deps.audit.record({
        type: "blue_moon_token_consume_failed",
        userId: input.consumingUserId,
        ipAddress: input.ipAddress,
        metadata: { reason: "user_not_found" },
      });
      throw new BlueMoonTokenInvalidError();
    }

    if (owner.id === input.consumingUserId) {
      throw new CannotFriendSelfError();
    }

    const result = await deps.friendships.consumeTokenAndCreateFriendship({
      tokenHash: hashBlueMoonToken(input.token),
      ownerId: owner.id,
      consumingUserId: input.consumingUserId,
      now: now(),
    });

    if (!result) {
      await deps.audit.record({
        type: "blue_moon_token_consume_failed",
        userId: input.consumingUserId,
        ipAddress: input.ipAddress,
        metadata: { reason: "invalid_or_expired_token" },
      });
      throw new BlueMoonTokenInvalidError();
    }

    await deps.audit.record({
      type: "friendship_created",
      userId: input.consumingUserId,
      ipAddress: input.ipAddress,
      metadata: {
        friendshipId: result.friendship.id,
        alreadyFriends: result.alreadyFriends,
      },
    });

    return toPublicFriendship(result.friendship, {
      id: owner.id,
      username: owner.username,
    });
  };
}
