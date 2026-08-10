import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createFakeIdentityContainer } from "../../test-utils/fake-identity-container.js";
import { createFakeSocialContainer } from "../../test-utils/fake-social-container.js";
import { createFakeMessagingContainer } from "../../test-utils/fake-messaging-container.js";
import type { ServerEnv } from "../../env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

function setup() {
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
  return { app, container: messaging.container };
}

type Setup = ReturnType<typeof setup>;

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

/** Befriends `a` and `b` through the real Social HTTP flow, so the
 * friendship exists exactly the way production creates one. */
async function befriend(
  app: Setup["app"],
  a: { accessToken: string },
  b: { accessToken: string; username: string },
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

describe("POST /messaging/conversations", () => {
  it("rejects an unauthenticated request", async () => {
    const { app } = setup();
    const res = await app.request("/messaging/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        otherUserId: "00000000-0000-0000-0000-000000000000",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("creates a conversation between authenticated friends", async () => {
    const { app } = setup();
    const a = await registerUser(app, "alice");
    const b = await registerUser(app, "bob");
    await befriend(app, a, { ...b, username: "bob" }, "alice");

    const res = await app.request("/messaging/conversations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${a.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ otherUserId: b.userId }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      data: { id: string; friend: { username: string }; online: boolean };
    };
    expect(body.data.friend.username).toBe("bob");
    expect(body.data.online).toBe(false);
  });

  it("rejects creating a conversation with a non-friend", async () => {
    const { app } = setup();
    const a = await registerUser(app, "carol");
    const b = await registerUser(app, "dave");

    const res = await app.request("/messaging/conversations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${a.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ otherUserId: b.userId }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects starting a conversation with yourself", async () => {
    const { app } = setup();
    const a = await registerUser(app, "erin");

    const res = await app.request("/messaging/conversations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${a.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ otherUserId: a.userId }),
    });
    expect(res.status).toBe(403);
  });

  it("is idempotent: creating twice returns the same conversation", async () => {
    const { app } = setup();
    const a = await registerUser(app, "frank");
    const b = await registerUser(app, "grace");
    await befriend(app, a, { ...b, username: "grace" }, "frank");

    const create = () =>
      app.request("/messaging/conversations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${a.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ otherUserId: b.userId }),
      });

    const first = await create();
    const second = await create();
    const firstBody = (await first.json()) as { data: { id: string } };
    const secondBody = (await second.json()) as { data: { id: string } };
    expect(secondBody.data.id).toBe(firstBody.data.id);
  });

  it("concurrent creation from both sides resolves to one conversation", async () => {
    const { app } = setup();
    const a = await registerUser(app, "henry");
    const b = await registerUser(app, "ivy");
    await befriend(app, a, { ...b, username: "ivy" }, "henry");

    const createFromA = () =>
      app.request("/messaging/conversations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${a.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ otherUserId: b.userId }),
      });
    const createFromB = () =>
      app.request("/messaging/conversations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${b.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ otherUserId: a.userId }),
      });

    const [resA, resB] = await Promise.all([createFromA(), createFromB()]);
    const bodyA = (await resA.json()) as { data: { id: string } };
    const bodyB = (await resB.json()) as { data: { id: string } };
    expect(bodyA.data.id).toBe(bodyB.data.id);
  });
});

describe("GET /messaging/conversations", () => {
  it("lists only the current user's conversations", async () => {
    const { app } = setup();
    const a = await registerUser(app, "jack");
    const b = await registerUser(app, "kate");
    const c = await registerUser(app, "liam");
    await befriend(app, a, { ...b, username: "kate" }, "jack");
    await app.request("/messaging/conversations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${a.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ otherUserId: b.userId }),
    });

    const resC = await app.request("/messaging/conversations", {
      headers: { authorization: `Bearer ${c.accessToken}` },
    });
    const bodyC = (await resC.json()) as { data: unknown[] };
    expect(bodyC.data).toHaveLength(0);

    const resA = await app.request("/messaging/conversations", {
      headers: { authorization: `Bearer ${a.accessToken}` },
    });
    const bodyA = (await resA.json()) as { data: unknown[] };
    expect(bodyA.data).toHaveLength(1);
  });
});

describe("GET /messaging/conversations/:id/messages", () => {
  it("returns persisted history, newest first", async () => {
    const { app, container } = setup();
    const a = await registerUser(app, "mona");
    const b = await registerUser(app, "nate");
    await befriend(app, a, { ...b, username: "nate" }, "mona");

    const convRes = await app.request("/messaging/conversations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${a.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ otherUserId: b.userId }),
    });
    const { data: conversation } = (await convRes.json()) as {
      data: { id: string };
    };

    await container.sendMessage({
      senderId: a.userId,
      conversationId: conversation.id,
      content: "first",
    });
    await container.sendMessage({
      senderId: b.userId,
      conversationId: conversation.id,
      content: "second",
    });

    const res = await app.request(
      `/messaging/conversations/${conversation.id}/messages`,
      { headers: { authorization: `Bearer ${a.accessToken}` } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { content: string }[] };
    expect(body.data.map((m) => m.content)).toEqual(["second", "first"]);
  });

  it("rejects a non-participant", async () => {
    const { app, container } = setup();
    const a = await registerUser(app, "oscar");
    const b = await registerUser(app, "paula");
    const outsider = await registerUser(app, "quinn");
    await befriend(app, a, { ...b, username: "paula" }, "oscar");

    const convRes = await app.request("/messaging/conversations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${a.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ otherUserId: b.userId }),
    });
    const { data: conversation } = (await convRes.json()) as {
      data: { id: string };
    };
    await container.sendMessage({
      senderId: a.userId,
      conversationId: conversation.id,
      content: "secret",
    });

    const res = await app.request(
      `/messaging/conversations/${conversation.id}/messages`,
      { headers: { authorization: `Bearer ${outsider.accessToken}` } },
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown conversation", async () => {
    const { app } = setup();
    const a = await registerUser(app, "ruth");

    const res = await app.request(
      `/messaging/conversations/00000000-0000-0000-0000-000000000000/messages`,
      { headers: { authorization: `Bearer ${a.accessToken}` } },
    );
    expect(res.status).toBe(404);
  });
});
