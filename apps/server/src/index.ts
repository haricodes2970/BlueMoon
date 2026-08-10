import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { loadServerEnv } from "./env.js";
import { createServerLogger } from "./logger.js";

const env = loadServerEnv();
const app = createApp(env);
const logger = createServerLogger(env);

// `noServer: true` -- @hono/node-server's serve() attaches this to
// the real http.Server's 'upgrade' event itself; see
// app.ts's `/messaging/ws` route (upgradeWebSocket) for the Hono side.
const wss = new WebSocketServer({ noServer: true });

serve(
  { fetch: app.fetch, port: env.PORT, websocket: { server: wss } },
  (info) => {
    logger.info(
      { port: info.port, environment: env.NODE_ENV },
      "apps/server listening",
    );
  },
);
