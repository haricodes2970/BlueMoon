import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import WebSocket from "ws";
import type { Database } from "@bluemoon/database";
import { createApp } from "../../app.js";
import { createIdentityContainer } from "../../container.js";
import { createSocialContainer } from "../../social-container.js";
import { createMessagingContainer } from "../../messaging-container.js";
import {
  createTestDatabase,
  hasTestDatabase,
  resetAllTables,
} from "../../test-utils/real-db.js";
import {
  startWsTestServer,
  stopWsTestServer,
} from "../../test-utils/ws-test-server.js";
import type { ServerEnv } from "../../env.js";

/**
 * Milestone 1.0: the WebSocket transport exercised end-to-end against
 * a real PostgreSQL instance and a real listening TCP server -- same
 * containers app.ts wires in production, not fakes. Complements
 * connection.test.ts (fake containers, database-free, covers the full
 * behavior matrix); this file exists to confirm the real Drizzle
 * repositories and real `serve({websocket})` wiring actually work
 * together, not just against in-memory fakes.
 */
describe.skipIf(!hasTestDatabase())(
  "Messaging WebSocket transport (real Postgres)",
  () => {
    const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";
    let db: Database;

    beforeAll(() => {
      db = createTestDatabase();
    });

    beforeEach(async () => {
      await resetAllTables(db);
    });

    afterAll(async () => {
      await db.$client.end();
    });

    async function setup() {
      const identityContainer = createIdentityContainer(db, TEST_SECRET);
      const socialContainer = createSocialContainer(db);
      const messagingContainer = createMessagingContainer(db);
      const env: ServerEnv = {
        NODE_ENV: "test",
        PORT: 8787,
        LOG_LEVEL: "silent",
        JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
        WEB_ORIGIN: "http://localhost:3000",
        COOKIE_SAME_SITE: "Lax",
      };
      const app = createApp(env, {
        identityContainer,
        socialContainer,
        messagingContainer,
      });
      const handle = await startWsTestServer(app);
      return { app, container: messagingContainer, ...handle };
    }

    type Setup = Awaited<ReturnType<typeof setup>>;

    async function registerUser(app: Setup["app"], username: string) {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          credential: "482913",
          deviceFingerprint: `device-${username}`,
        }),
      });
      const body = (await res.json()) as {
        data: { user: { id: string }; accessToken: string };
      };
      return { userId: body.data.user.id, accessToken: body.data.accessToken };
    }

    async function befriend(
      app: Setup["app"],
      a: { accessToken: string },
      b: { accessToken: string },
      aUsername: string,
    ) {
      const genRes = await app.request("/social/blue-moon-tokens", {
        method: "POST",
        headers: { authorization: `Bearer ${a.accessToken}` },
      });
      const { data: tokenData } = (await genRes.json()) as {
        data: { token: string };
      };
      await app.request("/social/friendships", {
        method: "POST",
        headers: {
          authorization: `Bearer ${b.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ username: aUsername, token: tokenData.token }),
      });
    }

    async function createConversation(
      app: Setup["app"],
      a: { accessToken: string },
      otherUserId: string,
    ) {
      const res = await app.request("/messaging/conversations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${a.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ otherUserId }),
      });
      const { data } = (await res.json()) as { data: { id: string } };
      return data.id;
    }

    async function getTicket(
      app: Setup["app"],
      accessToken: string,
    ): Promise<string> {
      const res = await app.request("/auth/ws-ticket", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const body = (await res.json()) as { data: { ticket: string } };
      return body.data.ticket;
    }

    function wsUrl(port: number, ticket: string): string {
      return `ws://127.0.0.1:${port}/messaging/ws?ticket=${ticket}`;
    }

    function waitForOpen(ws: WebSocket): Promise<void> {
      return new Promise((resolve, reject) => {
        ws.once("open", resolve);
        ws.once("error", reject);
      });
    }

    function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("timed out waiting for a WS message")),
          2000,
        );
        ws.once("message", (data) => {
          clearTimeout(timeout);
          resolve(JSON.parse(data.toString()) as Record<string, unknown>);
        });
      });
    }

    let handle: Setup;
    const sockets: WebSocket[] = [];

    afterEach(async () => {
      for (const ws of sockets.splice(0)) {
        ws.on("error", () => {});
        try {
          ws.terminate();
        } catch {
          // expected for sockets whose handshake never completed
        }
      }
      if (handle) await stopWsTestServer(handle);
    });

    function connect(handle: Setup, ticket: string): WebSocket {
      const ws = new WebSocket(wsUrl(handle.port, ticket));
      ws.on("error", () => {});
      sockets.push(ws);
      return ws;
    }

    it("delivers a message end-to-end and persists it in Postgres", async () => {
      handle = await setup();
      const a = await registerUser(handle.app, "wspgalice");
      const b = await registerUser(handle.app, "wspgbob");
      await befriend(handle.app, a, b, "wspgalice");
      const conversationId = await createConversation(handle.app, a, b.userId);

      const ticketA = await getTicket(handle.app, a.accessToken);
      const ticketB = await getTicket(handle.app, b.accessToken);
      const wsA = connect(handle, ticketA);
      const wsB = connect(handle, ticketB);
      await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);

      const received = waitForMessage(wsB);
      wsA.send(
        JSON.stringify({
          type: "send_message",
          conversationId,
          content: "hello over real postgres",
        }),
      );
      const event = await received;
      expect((event.data as { content: string }).content).toBe(
        "hello over real postgres",
      );

      const historyRes = await handle.app.request(
        `/messaging/conversations/${conversationId}/messages`,
        { headers: { authorization: `Bearer ${a.accessToken}` } },
      );
      const history = (await historyRes.json()) as {
        data: { content: string }[];
      };
      expect(history.data).toHaveLength(1);
      expect(history.data[0]?.content).toBe("hello over real postgres");
    });

    it("persists a message sent while the recipient is disconnected", async () => {
      handle = await setup();
      const a = await registerUser(handle.app, "wspgcarol");
      const b = await registerUser(handle.app, "wspgdave");
      await befriend(handle.app, a, b, "wspgcarol");
      const conversationId = await createConversation(handle.app, a, b.userId);

      const ticketA = await getTicket(handle.app, a.accessToken);
      const wsA = connect(handle, ticketA);
      await waitForOpen(wsA);

      wsA.send(
        JSON.stringify({
          type: "send_message",
          conversationId,
          content: "still here when you reconnect",
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 150));

      const messages = await handle.container.listMessages({
        requesterId: b.userId,
        conversationId,
        limit: 10,
      });
      expect(messages).toHaveLength(1);
      expect(messages[0]?.content).toBe("still here when you reconnect");
    });
  },
);
