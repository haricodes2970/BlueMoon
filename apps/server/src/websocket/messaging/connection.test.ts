import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { createApp } from "../../app.js";
import { hashWsTicket } from "../../infrastructure/identity/ws-ticket.js";
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
    COOKIE_SAME_SITE: "Lax",
  };
  const app = createApp(env, {
    identityContainer: identity.container,
    socialContainer: social.container,
    messagingContainer: messaging.container,
  });
  const handle = await startWsTestServer(app);
  return {
    app,
    container: messaging.container,
    identityContainer: identity.container,
    ...handle,
  };
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

// Mirrors the real flow: an already-authenticated caller requests a
// short-lived, single-use ticket over the normal Bearer-authenticated
// HTTP path before ever touching the WS URL.
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

function wsUrl(port: number, ticket?: string): string {
  const query = ticket ? `?ticket=${ticket}` : "";
  return `ws://127.0.0.1:${port}/messaging/ws${query}`;
}

function legacyAccessTokenWsUrl(port: number, accessToken: string): string {
  return `ws://127.0.0.1:${port}/messaging/ws?access_token=${accessToken}`;
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

  function connect(url: string): WebSocket {
    const ws = new WebSocket(url);
    // A rejected handshake (see "unexpected-response" tests) makes
    // `ws` emit a second, async "error" event during cleanup; without
    // a listener Node treats that as an uncaught exception. Harmless
    // here -- the rejection is asserted via "unexpected-response".
    ws.on("error", () => {});
    sockets.push(ws);
    return ws;
  }

  function connectWithTicket(ticket?: string): WebSocket {
    return connect(wsUrl(handle.port, ticket));
  }

  function connectWithOrigin(ticket: string, origin: string): WebSocket {
    const ws = new WebSocket(wsUrl(handle.port, ticket), { origin });
    ws.on("error", () => {});
    sockets.push(ws);
    return ws;
  }

  // Resolves once the handshake settles either way -- used for the
  // concurrent-use test, where both branches (open vs. rejected) are
  // expected outcomes, not a pass/fail signal by themselves.
  function attemptConnect(
    ticket: string,
  ): Promise<{ opened: boolean; statusCode?: number }> {
    const ws = connectWithTicket(ticket);
    return new Promise((resolve) => {
      ws.once("open", () => resolve({ opened: true }));
      ws.once("unexpected-response", (_req, res) => {
        resolve({ opened: false, statusCode: res.statusCode });
      });
    });
  }

  it("rejects a connection with no ticket", async () => {
    const ws = connectWithTicket();
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("rejects a connection with an invalid ticket", async () => {
    const ws = connectWithTicket("not-a-real-ticket");
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("rejects the old query-string access_token scheme", async () => {
    const a = await registerUser(handle.app, "wsoldscheme");
    const ws = connect(legacyAccessTokenWsUrl(handle.port, a.accessToken));
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("rejects a handshake whose Origin header doesn't match WEB_ORIGIN", async () => {
    const a = await registerUser(handle.app, "wsbadorigin");
    const ticket = await getTicket(handle.app, a.accessToken);
    const ws = connectWithOrigin(ticket, "https://evil.example");
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("accepts a handshake whose Origin header matches WEB_ORIGIN", async () => {
    const a = await registerUser(handle.app, "wsgoodorigin");
    const ticket = await getTicket(handle.app, a.accessToken);
    const ws = connectWithOrigin(ticket, "http://localhost:3000");
    await expect(waitForOpen(ws)).resolves.toBeUndefined();
  });

  it("rejects an expired ticket", async () => {
    const a = await registerUser(handle.app, "wsexpired");
    const payload = await handle.identityContainer.accessTokens.verify(
      a.accessToken,
    );
    if (!payload) throw new Error("expected a valid access token payload");

    const rawTicket = "expired-raw-ticket-value-for-testing";
    await handle.identityContainer.wsTickets.create({
      sessionId: payload.sessionId,
      userId: payload.userId,
      deviceId: payload.deviceId,
      ticketHash: hashWsTicket(rawTicket),
      expiresAt: new Date(Date.now() - 1000),
    });

    const ws = connectWithTicket(rawTicket);
    const { statusCode } = await waitForRejection(ws);
    expect(statusCode).toBe(401);
  });

  it("rejects reuse of an already-consumed ticket", async () => {
    const a = await registerUser(handle.app, "wsreuse");
    const ticket = await getTicket(handle.app, a.accessToken);

    const ws1 = connectWithTicket(ticket);
    await waitForOpen(ws1);

    const ws2 = connectWithTicket(ticket);
    const { statusCode } = await waitForRejection(ws2);
    expect(statusCode).toBe(401);
  });

  it("allows exactly one connection to win a concurrent race for the same ticket", async () => {
    const a = await registerUser(handle.app, "wsconcurrent");
    const ticket = await getTicket(handle.app, a.accessToken);

    const [resultX, resultY] = await Promise.all([
      attemptConnect(ticket),
      attemptConnect(ticket),
    ]);

    const opened = [resultX, resultY].filter((r) => r.opened);
    const rejected = [resultX, resultY].filter((r) => !r.opened);
    expect(opened).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.statusCode).toBe(401);
  });

  it("accepts an authenticated connection", async () => {
    const a = await registerUser(handle.app, "wsalice");
    const ticket = await getTicket(handle.app, a.accessToken);
    const ws = connectWithTicket(ticket);
    await expect(waitForOpen(ws)).resolves.toBeUndefined();
  });

  it("delivers a sent message to the other participant in real time", async () => {
    const a = await registerUser(handle.app, "wsbob");
    const b = await registerUser(handle.app, "wscarol");
    await befriend(handle.app, a, b, "wsbob");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const ticketA = await getTicket(handle.app, a.accessToken);
    const ticketB = await getTicket(handle.app, b.accessToken);
    const wsA = connectWithTicket(ticketA);
    const wsB = connectWithTicket(ticketB);
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

    const ticketA = await getTicket(handle.app, a.accessToken);
    const wsA = connectWithTicket(ticketA);
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

    const outsiderTicket = await getTicket(handle.app, outsider.accessToken);
    const wsOutsider = connectWithTicket(outsiderTicket);
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

    const ticketA = await getTicket(handle.app, a.accessToken);
    const wsA = connectWithTicket(ticketA);
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

  it("replies with an error event and stays open on a malformed (non-JSON) frame", async () => {
    const a = await registerUser(handle.app, "wsmalformed");
    const ticketA = await getTicket(handle.app, a.accessToken);
    const wsA = connectWithTicket(ticketA);
    await waitForOpen(wsA);

    const received = waitForMessage(wsA);
    wsA.send("this is not json");
    const event = await received;
    expect(event.type).toBe("error");

    // Connection must still be usable afterward -- a malformed frame
    // is a client mistake, not a reason to drop the socket.
    expect(wsA.readyState).toBe(WebSocket.OPEN);
  });

  it("terminates a connection sending a frame over the configured max payload", async () => {
    const a = await registerUser(handle.app, "wsoversized");
    const ticketA = await getTicket(handle.app, a.accessToken);
    const wsA = connectWithTicket(ticketA);
    await waitForOpen(wsA);

    const closed = new Promise<{ code: number }>((resolve) => {
      wsA.once("close", (code) => resolve({ code }));
    });
    // WS_TEST_MAX_PAYLOAD_BYTES is 64KB (ws-test-server.ts) -- well
    // over that forces the server to reject the frame per RFC 6455
    // (close code 1009, Message Too Big) instead of buffering it.
    wsA.send("x".repeat(80 * 1024));
    const { code } = await closed;
    expect(code).toBe(1009);
  });

  it("rate limits send_message volume per connection", async () => {
    const a = await registerUser(handle.app, "wsflood");
    const b = await registerUser(handle.app, "wsfloodtarget");
    await befriend(handle.app, a, b, "wsflood");
    const conversationId = await createConversation(handle.app, a, b.userId);

    const ticketA = await getTicket(handle.app, a.accessToken);
    const wsA = connectWithTicket(ticketA);
    await waitForOpen(wsA);

    // The broadcaster echoes every sent message back to the sender
    // too (multi-device sync), so a bare "wait for the next message"
    // would race against those echoes -- collect every event instead
    // and look for the rate-limit error among them.
    const events: Record<string, unknown>[] = [];
    wsA.on("message", (data) => {
      events.push(JSON.parse(data.toString()) as Record<string, unknown>);
    });

    // The WS send_message limiter (app.ts) allows 20 per 10s window --
    // send one more than that.
    for (let i = 0; i < 21; i++) {
      wsA.send(
        JSON.stringify({
          type: "send_message",
          conversationId,
          content: `msg ${i}`,
        }),
      );
    }

    await vi.waitFor(() => {
      expect(
        events.some(
          (e) =>
            e.type === "error" &&
            /too many/i.test((e.data as { message: string }).message),
        ),
      ).toBe(true);
    });
  });

  it("syncs a sender's own other connections (multi-device)", async () => {
    const a = await registerUser(handle.app, "wskevin");
    const b = await registerUser(handle.app, "wslinda");
    await befriend(handle.app, a, b, "wskevin");
    const conversationId = await createConversation(handle.app, a, b.userId);

    // Each socket needs its own ticket -- a ticket is single-use.
    const ticketA1 = await getTicket(handle.app, a.accessToken);
    const ticketA2 = await getTicket(handle.app, a.accessToken);
    const wsA1 = connectWithTicket(ticketA1);
    const wsA2 = connectWithTicket(ticketA2);
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

    const ticketA = await getTicket(handle.app, a.accessToken);
    const wsA = connectWithTicket(ticketA);
    await waitForOpen(wsA);
    expect(handle.container.presence.isOnline(a.userId)).toBe(true);

    const closed = new Promise((resolve) => wsA.once("close", resolve));
    wsA.close();
    await closed;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(handle.container.presence.isOnline(a.userId)).toBe(false);
  });
});
