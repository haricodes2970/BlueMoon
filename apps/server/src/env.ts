import { z } from "zod";
import { extendEnvSchema, loadEnv } from "@bluemoon/config";

export const serverEnvSchema = extendEnvSchema({
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /** Signs Identity access tokens (JWT, HS256) -- see ADR-0024. */
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function loadServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return loadEnv(serverEnvSchema, source);
}
