import { serve } from "@hono/node-server";
import { WebSocketServer, type WebSocket } from "ws";
import { createApp } from "./app.js";
import { loadServerEnv } from "./env.js";
import { createServerLogger } from "./logger.js";
import { sweepConnections } from "./infrastructure/messaging/heartbeat.js";

const env = loadServerEnv();
const app = createApp(env);
const logger = createServerLogger(env);

// Generous relative to MESSAGE_CONTENT_MAX_LENGTH (4000 chars, ~16KB
// worst case UTF-8) plus JSON envelope overhead -- `ws`'s own default
// (100MiB) is large enough to let one connection hold a meaningful
// chunk of memory on an oversized frame, so this is bounded
// explicitly rather than left at the library default.
const WS_MAX_PAYLOAD_BYTES = 64 * 1024;
const WS_HEARTBEAT_INTERVAL_MS = 30_000;

type TrackedWebSocket = WebSocket & { isAlive: boolean };

// `noServer: true` -- @hono/node-server's serve() attaches this to
// the real http.Server's 'upgrade' event itself; see
// app.ts's `/messaging/ws` route (upgradeWebSocket) for the Hono side.
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: WS_MAX_PAYLOAD_BYTES,
});

// Independent of Hono's own 'connection' listener (@hono/node-server
// resolves the per-route WSEvents via the same `wss` instance) --
// EventEmitter supports multiple 'connection' listeners, so this only
// adds heartbeat tracking without touching the request/response path.
wss.on("connection", (ws: WebSocket) => {
  const tracked = ws as TrackedWebSocket;
  tracked.isAlive = true;
  ws.on("pong", () => {
    tracked.isAlive = true;
  });
});

const heartbeatTimer = setInterval(() => {
  sweepConnections(wss.clients as unknown as Iterable<TrackedWebSocket>);
}, WS_HEARTBEAT_INTERVAL_MS);

const server = serve(
  { fetch: app.fetch, port: env.PORT, websocket: { server: wss } },
  (info) => {
    logger.info(
      { port: info.port, environment: env.NODE_ENV },
      "apps/server listening",
    );
  },
);

// Render (and most PaaS deploys) send SIGTERM before killing the
// process on every redeploy/restart -- without this, in-flight WS
// connections are dropped with no close frame and any request mid-
// flight is simply cut off, instead of a clean 1001 close and a
// bounded drain window.
function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, "shutting down");
  clearInterval(heartbeatTimer);

  for (const ws of wss.clients) {
    ws.close(1001, "Server shutting down");
  }

  server.close(() => {
    logger.info("http server closed");
    process.exit(0);
  });

  // Force-exit if close() never completes (e.g. a socket refuses to
  // close) rather than hang the deploy indefinitely.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
