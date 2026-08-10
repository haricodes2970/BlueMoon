import type { Conversation } from "../../domain/messaging/entities/conversation.js";
import type { Message } from "../../domain/messaging/entities/message.js";

/**
 * The only conversation shape allowed to cross out of this layer --
 * resolved to "the other participant" from the viewer's perspective,
 * same pattern as services/social/dto.ts's PublicFriendship.
 */
export interface PublicConversation {
  id: string;
  friend: { id: string; username: string };
  createdAt: Date;
  online: boolean;
}

export function toPublicConversation(
  conversation: Conversation,
  friendUser: { id: string; username: string },
  online: boolean,
): PublicConversation {
  return {
    id: conversation.id,
    friend: friendUser,
    createdAt: conversation.createdAt,
    online,
  };
}

export interface PublicMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string;
  createdAt: Date;
}

export function toPublicMessage(message: Message): PublicMessage {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt,
  };
}
