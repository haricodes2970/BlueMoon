import { z } from "zod";

/** Query-string shape for GET /messaging/conversations/:id/messages. */
export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.coerce.date().optional(),
});

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
