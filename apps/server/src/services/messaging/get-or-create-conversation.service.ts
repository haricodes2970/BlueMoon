import {
  CannotMessageSelfError,
  NotFriendsError,
} from "../../domain/messaging/errors.js";
import type { ConversationRepository } from "../../repositories/messaging/conversation.repository.js";
import type { FriendshipRepository } from "../../repositories/social/friendship.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";
import type { PresenceRegistry } from "../../infrastructure/messaging/presence-registry.js";
import { toPublicConversation, type PublicConversation } from "./dto.js";

export interface GetOrCreateConversationDependencies {
  conversations: ConversationRepository;
  friendships: FriendshipRepository;
  users: UserRepository;
  presence: PresenceRegistry;
}

export interface GetOrCreateConversationInput {
  requesterId: string;
  otherUserId: string;
}

/**
 * Interim Milestone 1.0 deviation from the canonical session/PIN
 * model: gated on an existing Social Friendship, not a username or
 * session alone -- see docs/adr/ADR-0027-messaging-friendship-gate-deviation.md.
 * Idempotent: calling this twice for the same pair returns the same
 * conversation (see ConversationRepository.findOrCreateForUsers).
 */
export function createGetOrCreateConversationUseCase(
  deps: GetOrCreateConversationDependencies,
) {
  return async function getOrCreateConversation(
    input: GetOrCreateConversationInput,
  ): Promise<PublicConversation> {
    if (input.requesterId === input.otherUserId) {
      throw new CannotMessageSelfError();
    }

    const friendship = await deps.friendships.findByUsers(
      input.requesterId,
      input.otherUserId,
    );
    if (!friendship) {
      throw new NotFriendsError();
    }

    const otherUser = await deps.users.findById(input.otherUserId);
    if (!otherUser) {
      // The friendship's FK is ON DELETE CASCADE, so a dangling
      // reference here would mean the friendship row should already
      // be gone -- see list-friendships.service.ts for the same
      // assumption.
      throw new NotFriendsError();
    }

    const conversation = await deps.conversations.findOrCreateForUsers(
      input.requesterId,
      input.otherUserId,
    );

    return toPublicConversation(
      conversation,
      { id: otherUser.id, username: otherUser.username },
      deps.presence.isOnline(otherUser.id),
    );
  };
}
