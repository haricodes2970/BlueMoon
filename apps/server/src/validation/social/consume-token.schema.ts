import { z } from "zod";

/**
 * Shape-only validation at the API boundary -- matches the pattern in
 * validation/identity/*.schema.ts. `token` isn't validated against
 * the exact generated encoding/length here; an invalid value simply
 * fails to match any stored hash and gets the same generic
 * BlueMoonTokenInvalidError as an expired/consumed one.
 */
export const consumeBlueMoonTokenRequestSchema = z.object({
  username: z.string().min(1).max(64),
  token: z.string().min(1).max(128),
});

export type ConsumeBlueMoonTokenRequest = z.infer<
  typeof consumeBlueMoonTokenRequestSchema
>;
