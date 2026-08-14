import type { AddressInfo } from "node:net";
import { serve, type ServerType } from "@hono/node-server";
import { WebSocketServer } from "ws";
import type { OpenAPIHono } from "@hono/zod-openapi";

/**
 * Real listening TCP server for WebSocket tests -- `app.request()`
 * (Hono's in-memory fetch helper, used by every other test file) can't
 * exercise a WS upgrade, which needs an actual `http.Server` 'upgrade'
 * event. Still database-free: the app passed in is built with fake
 * containers, only the transport is real. Same `serve({websocket:
 * {server: wss}})` wiring as production's index.ts.
 */
/** Mirrors index.ts's production limit so oversized-frame tests exercise the same bound. */
export const WS_TEST_MAX_PAYLOAD_BYTES = 64 * 1024;

export function startWsTestServer(
  app: OpenAPIHono,
): Promise<{ server: ServerType; wss: WebSocketServer; port: number }> {
  return new Promise((resolve) => {
    const wss = new WebSocketServer({
      noServer: true,
      maxPayload: WS_TEST_MAX_PAYLOAD_BYTES,
    });
    const server = serve(
      { fetch: app.fetch, port: 0, websocket: { server: wss } },
      (info: AddressInfo) => {
        resolve({ server, wss, port: info.port });
      },
    );
  });
}

export function stopWsTestServer(handle: {
  server: ServerType;
  wss: WebSocketServer;
}): Promise<void> {
  return new Promise((resolve) => {
    handle.wss.close();
    handle.server.close(() => resolve());
  });
}
