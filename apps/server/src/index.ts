import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadServerEnv } from "./env.js";
import { createServerLogger } from "./logger.js";

const env = loadServerEnv();
const app = createApp(env);
const logger = createServerLogger(env);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info(
    { port: info.port, environment: env.NODE_ENV },
    "apps/server listening",
  );
});
