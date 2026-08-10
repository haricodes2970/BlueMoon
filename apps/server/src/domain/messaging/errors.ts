import { ForbiddenError, NotFoundError } from "@bluemoon/utils";

export class ConversationNotFoundError extends NotFoundError {
  constructor() {
    super("Conversation not found");
    this.name = "ConversationNotFoundError";
  }
}

/** The requesting user is neither participant in the conversation. */
export class ConversationForbiddenError extends ForbiddenError {
  constructor() {
    super("Not a participant in this conversation");
    this.name = "ConversationForbiddenError";
  }
}

/**
 * Interim Milestone 1.0 deviation: conversations are gated on an
 * existing Friendship rather than the canonical session/PIN model --
 * see docs/adr/ADR-0027-messaging-friendship-gate-deviation.md.
 */
export class NotFriendsError extends ForbiddenError {
  constructor() {
    super("You can only message BlueMoon friends");
    this.name = "NotFriendsError";
  }
}

export class CannotMessageSelfError extends ForbiddenError {
  constructor() {
    super("Cannot start a conversation with yourself");
    this.name = "CannotMessageSelfError";
  }
}
