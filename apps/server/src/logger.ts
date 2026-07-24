import { createLogger } from "@bluemoon/utils";
import type { ServerEnv } from "./env.js";

export function createServerLogger(env: ServerEnv) {
  return createLogger({
    environment: env.NODE_ENV,
    level: env.LOG_LEVEL,
    name: "@bluemoon/server",
  });
}
