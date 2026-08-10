import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createApp } from "../../app.js";
import { createFakeIdentityContainer } from "../../test-utils/fake-identity-container.js";
import { createFakeSocialContainer } from "../../test-utils/fake-social-container.js";
import { createFakeMessagingContainer } from "../../test-utils/fake-messaging-container.js";
import {
  startWsTestServer,
  stopWsTestServer,
} from "../../test-utils/ws-test-server.js";
import type { ServerEnv } from "../../env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

async function setup() {
  const identity = createFakeIdentityContainer(TEST_SECRET);
  const social = createFakeSocialContainer(identity.container.users);
  const messaging = createFakeMessagingContainer(
    identity.container.users,
    social.friendships,
  );
  const env: ServerEnv = {
    NODE_ENV: "test",
    PORT: 8787,
    LOG_LEVEL: "silent",
    JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
    WEB_ORIGIN: "http://localhost:3000",
  };
  const app = createApp(env, {
    identityContainer: identity.container,
    socialContainer: social.container,
    messagingContainer: messaging.container,
  });
  const handle = await startWsTestServer(app);
  return { app, container: messaging.container, ...handle };
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

function wsUrl(port: number, accessToken?: string): string {
  const query = accessToken ? `?access_token=${accessToken}` : "";
  return `ws://127.0.0.1:${port}/messaging/ws${query}`;
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

function waitForRejection(
  ws: WebSocket,
): Promise<{ statusCode: number | undefined }> {
  return new Promise((resolve) => {
    ws.once("unexpected-response", (_req, res) => {
      resolve({ statusCode: res.statusCode });
    });
  });
}

describe("Messaging WebSocket transport", () => {
  let handle: Setup;
  const sockets: WebSocket[] = [];

  beforeEach(async () => {
    handle = await setup();
  });

  afterEach(async () => {
    for (const ws of sockets.splice(0)) {
      // Some tests intentionally leave a rejected/never-opened socket
      // (the handshake failed with a non-101 response); `ws` throws
      // from close()/terminate() in that exact state, which is
      // expected here, not a real failure -- swallow it.
      try {
        ws.terminate();
      } catch {
        // expected for sockets whose handshake never completed
      }
    }
    await stopWsTestServer(handle);
  });

  function connect(accessToken?: string): WebSocket {
    const ws = new WebSocket(wsUrl(handle.port, accessToken));
    // A rejected handshake (see "unexpected-response" tests) makes
    // `ws` emit a second, async "error" event during cleanup; without
    // a listener Node treats that as an uncaught exception. Harmless
    // here -- the rejection is asserted via "unexpected-response".
    ws.on("error", () => {});
    sockets.push(ws);
    return ws;
  }

  it("rejects a connection with no access token", async () => {
    const ws = connect();
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("rejects a connection with an invalid access token", async () => {
    const ws = connect("not-a-real-token");
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("accepts an authenticated connection", async () => {
    const a = await registerUser(handle.app, "wsalice");
    const ws = connect(a.accessToken);
    await expect(waitForOpen(ws)).resolves.toBeUndefined();
  });

  it("delivers a sent message to the other participant in real time", async () => {
    const a = await registerUser(handle.app, "wsbob");
    const b = await registerUser(handle.app, "wscarol");
    await befriend(handle.app, a, b, "wsbob");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const wsA = connect(a.accessToken);
    const wsB = connect(b.accessToken);
    await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);

    const received = waitForMessage(wsB);
    wsA.send(
      JSON.stringify({
        type: "send_message",
        conversationId,
        content: "hello bob",
      }),
    );

    const event = await received;
    expect(event.type).toBe("message");
    expect((event.data as { content: string }).content).toBe("hello bob");
    expect((event.data as { senderId: string }).senderId).toBe(a.userId);
  });

  it("persists the message even if the recipient is disconnected", async () => {
    const a = await registerUser(handle.app, "wsdave");
    const b = await registerUser(handle.app, "wserin");
    await befriend(handle.app, a, b, "wsdave");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const wsA = connect(a.accessToken);
    await waitForOpen(wsA);
    // B never connects.

    wsA.send(
      JSON.stringify({
        type: "send_message",
        conversationId,
        content: "are you there",
      }),
    );
    // Give the (in-process, synchronous-ish) send a moment to complete.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const messages = await handle.container.listMessages({
      requesterId: b.userId,
      conversationId,
      limit: 10,
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe("are you there");
  });

  it("rejects sending to a conversation the sender isn't part of", async () => {
    const a = await registerUser(handle.app, "wsfrank");
    const b = await registerUser(handle.app, "wsgrace");
    const outsider = await registerUser(handle.app, "wsharry");
    await befriend(handle.app, a, b, "wsfrank");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const wsOutsider = connect(outsider.accessToken);
    await waitForOpen(wsOutsider);

    const received = waitForMessage(wsOutsider);
    wsOutsider.send(
      JSON.stringify({
        type: "send_message",
        conversationId,
        content: "sneaky",
      }),
    );

    const event = await received;
    expect(event.type).toBe("error");
  });

  it("rejects empty message content", async () => {
    const a = await registerUser(handle.app, "wsivan");
    const b = await registerUser(handle.app, "wsjulia");
    await befriend(handle.app, a, b, "wsivan");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const wsA = connect(a.accessToken);
    await waitForOpen(wsA);

    const received = waitForMessage(wsA);
    wsA.send(
      JSON.stringify({ type: "send_message", conversationId, content: "   " }),
    );
    // Schema-level min(1) rejects whitespace only if trimmed -- this
    // goes through the domain rule instead, confirming both layers agree.
    const event = await received;
    expect(event.type).toBe("error");
  });

  it("syncs a sender's own other connections (multi-device)", async () => {
    const a = await registerUser(handle.app, "wskevin");
    const b = await registerUser(handle.app, "wslinda");
    await befriend(handle.app, a, b, "wskevin");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const wsA1 = connect(a.accessToken);
    const wsA2 = connect(a.accessToken);
    await Promise.all([waitForOpen(wsA1), waitForOpen(wsA2)]);

    const receivedOnSecondTab = waitForMessage(wsA2);
    wsA1.send(
      JSON.stringify({
        type: "send_message",
        conversationId,
        content: "synced",
      }),
    );

    const event = await receivedOnSecondTab;
    expect((event.data as { content: string }).content).toBe("synced");
  });

  it("reflects presence: online while connected, offline after disconnect", async () => {
    const a = await registerUser(handle.app, "wsmike");
    const b = await registerUser(handle.app, "wsnina");
    await befriend(handle.app, a, b, "wsmike");
    await createConversation(handle.app, a, b.userId);

    expect(handle.container.presence.isOnline(a.userId)).toBe(false);

    const wsA = connect(a.accessToken);
    await waitForOpen(wsA);
    expect(handle.container.presence.isOnline(a.userId)).toBe(true);

    const closed = new Promise((resolve) => wsA.once("close", resolve));
    wsA.close();
    await closed;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(handle.container.presence.isOnline(a.userId)).toBe(false);
  });
});
