import { z } from "zod";

export const revokeSessionRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export type RevokeSessionRequest = z.infer<typeof revokeSessionRequestSchema>;
