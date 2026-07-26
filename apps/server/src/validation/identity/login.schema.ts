import { z } from "zod";

export const loginRequestSchema = z.object({
  username: z.string().min(1).max(64),
  credential: z.string().min(1).max(16),
  deviceFingerprint: z.string().min(1).max(256),
  deviceLabel: z.string().max(128).nullable().optional(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
