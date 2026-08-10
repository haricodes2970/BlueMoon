import { z } from "zod";

export const getOrCreateConversationRequestSchema = z.object({
  otherUserId: z.string().uuid(),
});

export type GetOrCreateConversationRequest = z.infer<
  typeof getOrCreateConversationRequestSchema
>;
