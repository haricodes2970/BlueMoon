import { ValidationError } from "@bluemoon/utils";
import { isParticipant } from "../../domain/messaging/entities/conversation.js";
import {
  ConversationForbiddenError,
  ConversationNotFoundError,
} from "../../domain/messaging/errors.js";
import {
  MessageContent,
  formatMessageContentValidationError,
} from "../../domain/messaging/value-objects/message-content.js";
import type { ConversationRepository } from "../../repositories/messaging/conversation.repository.js";
import type { MessageRepository } from "../../repositories/messaging/message.repository.js";
import type { MessageBroadcaster } from "../../infrastructure/messaging/broadcaster.js";
import { toPublicMessage, type PublicMessage } from "./dto.js";

export interface SendMessageDependencies {
  conversations: ConversationRepository;
  messages: MessageRepository;
  broadcaster: MessageBroadcaster;
}

export interface SendMessageInput {
  senderId: string;
  conversationId: string;
  content: string;
}

/**
 * Persist-then-broadcast: the message is written to Postgres first;
 * broadcasting to connected sockets is a best-effort side effect
 * afterward (see infrastructure/messaging/broadcaster.ts). The
 * database is the source of truth regardless of whether the
 * recipient is currently connected -- WS delivery is not persistence.
 * Broadcasts to both participants so a sender with multiple open
 * tabs/devices stays in sync too.
 */
export function createSendMessageUseCase(deps: SendMessageDependencies) {
  return async function sendMessage(
    input: SendMessageInput,
  ): Promise<PublicMessage> {
    const conversation = await deps.conversations.findById(
      input.conversationId,
    );
    if (!conversation) {
      throw new ConversationNotFoundError();
    }
    if (!isParticipant(conversation, input.senderId)) {
      throw new ConversationForbiddenError();
    }

    const contentResult = MessageContent.create(input.content);
    if (!contentResult.ok) {
      throw new ValidationError(
        formatMessageContentValidationError(contentResult.error),
      );
    }

    const message = await deps.messages.create({
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: contentResult.value.toString(),
    });

    const publicMessage = toPublicMessage(message);
    const event = { type: "message", data: publicMessage };
    deps.broadcaster.sendToUser(conversation.userAId, event);
    deps.broadcaster.sendToUser(conversation.userBId, event);

    return publicMessage;
  };
}
