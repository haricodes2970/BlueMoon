import { randomUUID } from "node:crypto";
import type { MessagingContainer } from "../messaging-container.js";
import type { UserRepository } from "../repositories/identity/user.repository.js";
import type { FriendshipRepository } from "../repositories/social/friendship.repository.js";
import type { ConversationRepository } from "../repositories/messaging/conversation.repository.js";
import type { MessageRepository } from "../repositories/messaging/message.repository.js";
import type { Conversation } from "../domain/messaging/entities/conversation.js";
import { canonicalizePair } from "../domain/messaging/entities/conversation.js";
import type { Message } from "../domain/messaging/entities/message.js";
import {
  createPresenceRegistry,
  type PresenceRegistry,
} from "../infrastructure/messaging/presence-registry.js";
import { createMessageBroadcaster } from "../infrastructure/messaging/broadcaster.js";
import { createGetOrCreateConversationUseCase } from "../services/messaging/get-or-create-conversation.service.js";
import { createListConversationsUseCase } from "../services/messaging/list-conversations.service.js";
import { createListMessagesUseCase } from "../services/messaging/list-messages.service.js";
import { createSendMessageUseCase } from "../services/messaging/send-message.service.js";

/**
 * In-memory fake, same shape as fake-social-container.ts. Takes the
 * caller's existing UserRepository and FriendshipRepository (from
 * fake-identity-container.ts / fake-social-container.ts) rather than
 * constructing its own, since real HTTP tests need conversation
 * creation to see the exact same users/friendships those fakes
 * already hold -- same reasoning as production's messaging-container.ts
 * reusing Identity's/Social's repositories.
 */
export function createFakeMessagingContainer(
  users: UserRepository,
  friendships: FriendshipRepository,
  presence: PresenceRegistry = createPresenceRegistry(),
): { container: MessagingContainer } {
  const conversationsById = new Map<string, Conversation>();
  const messagesById = new Map<string, Message>();

  const conversations: ConversationRepository = {
    async findById(id) {
      return conversationsById.get(id) ?? null;
    },
    async findByUsers(userId1, userId2) {
      const [a, b] = canonicalizePair(userId1, userId2);
      return (
        [...conversationsById.values()].find(
          (c) => c.userAId === a && c.userBId === b,
        ) ?? null
      );
    },
    async listForUser(userId) {
      return [...conversationsById.values()].filter(
        (c) => c.userAId === userId || c.userBId === userId,
      );
    },
    async findOrCreateForUsers(userId1, userId2) {
      const [a, b] = canonicalizePair(userId1, userId2);
      const existing = [...conversationsById.values()].find(
        (c) => c.userAId === a && c.userBId === b,
      );
      if (existing) return existing;

      const conversation: Conversation = {
        id: randomUUID(),
        userAId: a,
        userBId: b,
        createdAt: new Date(),
      };
      conversationsById.set(conversation.id, conversation);
      return conversation;
    },
  };

  // Real Postgres timestamps have microsecond precision; JS `Date`
  // only has millisecond precision, so fast successive fake inserts
  // can tie on `createdAt`. This sequence exists purely to keep this
  // in-memory fake's ordering deterministic under that tie -- there
  // is no equivalent column on the real `messages` table.
  let sequence = 0;
  const sequenceById = new Map<string, number>();

  const messages: MessageRepository = {
    async create(input) {
      const message: Message = {
        id: randomUUID(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        content: input.content,
        createdAt: new Date(),
      };
      messagesById.set(message.id, message);
      sequenceById.set(message.id, sequence++);
      return message;
    },
    async listForConversation(input) {
      const all = [...messagesById.values()]
        .filter((m) => m.conversationId === input.conversationId)
        .sort((x, y) => {
          const byTime = y.createdAt.getTime() - x.createdAt.getTime();
          if (byTime !== 0) return byTime;
          return sequenceById.get(y.id)! - sequenceById.get(x.id)!;
        });
      const filtered = input.before
        ? all.filter((m) => m.createdAt.getTime() < input.before!.getTime())
        : all;
      return filtered.slice(0, input.limit);
    },
  };

  const broadcaster = createMessageBroadcaster(presence);

  const container: MessagingContainer = {
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

  return { container };
}
