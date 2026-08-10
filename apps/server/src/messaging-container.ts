import type { Database } from "@bluemoon/database";
import { createUserRepository } from "./repositories/identity/user.repository.js";
import { createFriendshipRepository } from "./repositories/social/friendship.repository.js";
import { createConversationRepository } from "./repositories/messaging/conversation.repository.js";
import { createMessageRepository } from "./repositories/messaging/message.repository.js";
import {
  createPresenceRegistry,
  type PresenceRegistry,
} from "./infrastructure/messaging/presence-registry.js";
import { createMessageBroadcaster } from "./infrastructure/messaging/broadcaster.js";
import { createGetOrCreateConversationUseCase } from "./services/messaging/get-or-create-conversation.service.js";
import { createListConversationsUseCase } from "./services/messaging/list-conversations.service.js";
import { createListMessagesUseCase } from "./services/messaging/list-messages.service.js";
import { createSendMessageUseCase } from "./services/messaging/send-message.service.js";

/**
 * Composition root for the Messaging bounded context -- same shape as
 * container.ts (Identity) and social-container.ts (Social). Reuses
 * Identity's UserRepository directly (as Social already does) and
 * additionally reuses Social's FriendshipRepository read-only, via a
 * new instance constructed here rather than widening SocialContainer's
 * public interface -- see docs/adr/ADR-0027-messaging-friendship-gate-deviation.md.
 * `presence` is exposed on the container (not just consumed internally)
 * so the WebSocket transport layer and app.ts can share the exact same
 * registry instance across HTTP reads and WS connection lifecycle.
 */
export interface MessagingContainer {
  presence: PresenceRegistry;
  getOrCreateConversation: ReturnType<
    typeof createGetOrCreateConversationUseCase
  >;
  listConversations: ReturnType<typeof createListConversationsUseCase>;
  listMessages: ReturnType<typeof createListMessagesUseCase>;
  sendMessage: ReturnType<typeof createSendMessageUseCase>;
}

export function createMessagingContainer(
  db: Database,
  presence: PresenceRegistry = createPresenceRegistry(),
): MessagingContainer {
  const users = createUserRepository(db);
  const friendships = createFriendshipRepository(db);
  const conversations = createConversationRepository(db);
  const messages = createMessageRepository(db);
  const broadcaster = createMessageBroadcaster(presence);

  return {
    presence,
    getOrCreateConversation: createGetOrCreateConversationUseCase({
      conversations,
      friendships,
      users,
      presence,
    }),
    listConversations: createListConversationsUseCase({
      conversations,
      users,
      presence,
    }),
    listMessages: createListMessagesUseCase({ conversations, messages }),
    sendMessage: createSendMessageUseCase({
      conversations,
      messages,
      broadcaster,
    }),
  };
}
