import { z } from "zod";
import { MESSAGE_CONTENT_MAX_LENGTH } from "../../domain/messaging/value-objects/message-content.js";

/**
 * Shape-only validation for the inbound WS "send_message" event.
 * Emptiness (after trim) is still enforced by
 * domain/messaging/value-objects/message-content.ts -- this only
 * bounds size before it reaches the domain rule.
 */
export const sendMessageEventSchema = z.object({
  type: z.literal("send_message"),
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(MESSAGE_CONTENT_MAX_LENGTH),
});

export type SendMessageEvent = z.infer<typeof sendMessageEventSchema>;
