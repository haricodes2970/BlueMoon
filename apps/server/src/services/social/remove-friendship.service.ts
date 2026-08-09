import {
  FriendshipForbiddenError,
  FriendshipNotFoundError,
} from "../../domain/social/errors.js";
import type { SocialAuditWriter } from "../../infrastructure/social/audit-writer.js";
import type { FriendshipRepository } from "../../repositories/social/friendship.repository.js";

export interface RemoveFriendshipDependencies {
  friendships: FriendshipRepository;
  audit: SocialAuditWriter;
}

export interface RemoveFriendshipInput {
  friendshipId: string;
  requestingUserId: string;
  ipAddress: string;
}

/**
 * Symmetric with trust-device revocation (Identity): anything you can
 * establish, you can also undo. Either participant may remove the
 * friendship -- there's no "owner" of a friendship once it exists.
 */
export function createRemoveFriendshipUseCase(
  deps: RemoveFriendshipDependencies,
) {
  return async function removeFriendship(
    input: RemoveFriendshipInput,
  ): Promise<void> {
    const friendship = await deps.friendships.findById(input.friendshipId);
    if (!friendship) {
      throw new FriendshipNotFoundError();
    }
    if (
      friendship.userAId !== input.requestingUserId &&
      friendship.userBId !== input.requestingUserId
    ) {
      throw new FriendshipForbiddenError();
    }

    await deps.friendships.remove(friendship.id);

    await deps.audit.record({
      type: "friendship_removed",
      userId: input.requestingUserId,
      ipAddress: input.ipAddress,
      metadata: { friendshipId: friendship.id },
    });
  };
}
