import { isParticipant } from "../../domain/messaging/entities/conversation.js";
import {
  ConversationForbiddenError,
  ConversationNotFoundError,
} from "../../domain/messaging/errors.js";
import type { ConversationRepository } from "../../repositories/messaging/conversation.repository.js";
import type { MessageRepository } from "../../repositories/messaging/message.repository.js";
import { toPublicMessage, type PublicMessage } from "./dto.js";

export interface ListMessagesDependencies {
  conversations: ConversationRepository;
  messages: MessageRepository;
}

export interface ListMessagesInput {
  requesterId: string;
  conversationId: string;
  limit: number;
  before?: Date;
}

/** Newest-first, matching MessageRepository.listForConversation. */
export function createListMessagesUseCase(deps: ListMessagesDependencies) {
  return async function listMessages(
    input: ListMessagesInput,
  ): Promise<PublicMessage[]> {
    const conversation = await deps.conversations.findById(
      input.conversationId,
    );
    if (!conversation) {
      throw new ConversationNotFoundError();
    }
    if (!isParticipant(conversation, input.requesterId)) {
      throw new ConversationForbiddenError();
    }

    const messages = await deps.messages.listForConversation({
      conversationId: input.conversationId,
      limit: input.limit,
      before: input.before,
    });
    return messages.map(toPublicMessage);
  };
}
