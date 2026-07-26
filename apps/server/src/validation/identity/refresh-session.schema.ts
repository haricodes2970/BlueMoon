import { z } from "zod";

export const refreshSessionRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshSessionRequest = z.infer<typeof refreshSessionRequestSchema>;
