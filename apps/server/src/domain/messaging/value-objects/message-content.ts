import { err, ok, type Result } from "@bluemoon/utils";

/**
 * Message content rules. Deliberately minimal for the MVP: reject
 * empty/whitespace-only text and cap length to a sane bound -- no
 * markup/formatting/mention rules yet.
 */
export const MESSAGE_CONTENT_MAX_LENGTH = 4000;

export type MessageContentValidationError =
  { kind: "empty" } | { kind: "too_long"; maxLength: number };

/**
 * A validated, trimmed message body. Only obtainable via
 * `MessageContent.create()` -- construction is the validation.
 */
export class MessageContent {
  private constructor(private readonly value: string) {}

  static create(
    raw: string,
  ): Result<MessageContent, MessageContentValidationError> {
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      return err({ kind: "empty" });
    }
    if (trimmed.length > MESSAGE_CONTENT_MAX_LENGTH) {
      return err({
        kind: "too_long",
        maxLength: MESSAGE_CONTENT_MAX_LENGTH,
      });
    }

    return ok(new MessageContent(trimmed));
  }

  toString(): string {
    return this.value;
  }
}

export function formatMessageContentValidationError(
  error: MessageContentValidationError,
): string {
  switch (error.kind) {
    case "empty":
      return "Message content cannot be empty";
    case "too_long":
      return `Message content must be at most ${error.maxLength} characters`;
  }
}
