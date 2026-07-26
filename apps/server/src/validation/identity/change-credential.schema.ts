import { z } from "zod";

export const changeCredentialRequestSchema = z.object({
  currentCredential: z.string().min(1).max(16),
  newCredential: z.string().min(1).max(16),
});

export type ChangeCredentialRequest = z.infer<
  typeof changeCredentialRequestSchema
>;
