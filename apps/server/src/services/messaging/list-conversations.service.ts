import { otherParticipant } from "../../domain/messaging/entities/conversation.js";
import type { ConversationRepository } from "../../repositories/messaging/conversation.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";
import type { PresenceRegistry } from "../../infrastructure/messaging/presence-registry.js";
import { toPublicConversation, type PublicConversation } from "./dto.js";

export interface ListConversationsDependencies {
  conversations: ConversationRepository;
  users: UserRepository;
  presence: PresenceRegistry;
}

export interface ListConversationsInput {
  userId: string;
}

export function createListConversationsUseCase(
  deps: ListConversationsDependencies,
) {
  return async function listConversations(
    input: ListConversationsInput,
  ): Promise<PublicConversation[]> {
    const conversations = await deps.conversations.listForUser(input.userId);

    const results: PublicConversation[] = [];
    for (const conversation of conversations) {
      const friendId = otherParticipant(conversation, input.userId);
      const friendUser = await deps.users.findById(friendId);
      // ON DELETE CASCADE on both conversation participant FKs, so a
      // dangling reference here would mean this row is already gone.
      if (!friendUser) continue;
      results.push(
        toPublicConversation(
          conversation,
          { id: friendUser.id, username: friendUser.username },
          deps.presence.isOnline(friendUser.id),
        ),
      );
    }
    return results;
  };
}
