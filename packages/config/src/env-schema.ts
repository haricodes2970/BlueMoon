import { z } from "zod";
import { ENVIRONMENTS } from "@bluemoon/types";

/**
 * Base environment schema every app extends. See
 * docs/engineering/environment-strategy.md for naming conventions.
 */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(ENVIRONMENTS).default("development"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

/** Extends the base env schema with app-specific fields. */
export function extendEnvSchema<T extends z.ZodRawShape>(shape: T) {
  return baseEnvSchema.extend(shape);
}
