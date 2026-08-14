import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { createFakeIdentityContainer } from "../../test-utils/fake-identity-container.js";
import { createFakeSocialContainer } from "../../test-utils/fake-social-container.js";
import type { ServerEnv } from "../../env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

function setup() {
  const identity = createFakeIdentityContainer(TEST_SECRET);
  const social = createFakeSocialContainer(identity.container.users);
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
  });
  return { app, auditEvents: social.auditEvents };
}

async function registerUser(
  app: ReturnType<typeof setup>["app"],
  username: string,
) {
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

async function generateToken(
  app: ReturnType<typeof setup>["app"],
  accessToken: string,
) {
  const res = await app.request("/social/blue-moon-tokens", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = (await res.json()) as {
    data: { token: string; expiresAt: string };
  };
  return { res, body };
}

async function consumeToken(
  app: ReturnType<typeof setup>["app"],
  accessToken: string,
  username: string,
  token: string,
) {
  return app.request("/social/friendships", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ username, token }),
  });
}

describe("POST /social/blue-moon-tokens", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("generates a token for the authenticated owner", async () => {
    const owner = await registerUser(app, "owner1");
    const { res, body } = await generateToken(app, owner.accessToken);

    expect(res.status).toBe(201);
    expect(body.data.token).toBeTruthy();
    expect(body.data.expiresAt).toBeTruthy();
  });

  it("does not expose a token hash in the response", async () => {
    const owner = await registerUser(app, "owner2");
    const { body } = await generateToken(app, owner.accessToken);

    expect(JSON.stringify(body)).not.toMatch(/hash/i);
  });

  it("requires authentication", async () => {
    const res = await app.request("/social/blue-moon-tokens", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /social/friendships (consume)", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("consuming a valid token creates a friendship", async () => {
    const owner = await registerUser(app, "alice");
    const consumer = await registerUser(app, "bob");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);

    const res = await consumeToken(
      app,
      consumer.accessToken,
      "alice",
      tokenBody.data.token,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      data: { friend: { username: string } };
    };
    expect(body.data.friend.username).toBe("alice");
  });

  it("rejects username alone -- token is required", async () => {
    const consumer = await registerUser(app, "carol");
    const res = await app.request("/social/friendships", {
      method: "POST",
      headers: {
        authorization: `Bearer ${consumer.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ username: "anyone" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid token", async () => {
    await registerUser(app, "dave");
    const consumer = await registerUser(app, "erin");

    const res = await consumeToken(
      app,
      consumer.accessToken,
      "dave",
      "not-a-real-token",
    );
    expect(res.status).toBe(401);
  });

  it("cannot be reused after successful consumption", async () => {
    const owner = await registerUser(app, "frank");
    const consumer = await registerUser(app, "grace");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);

    const first = await consumeToken(
      app,
      consumer.accessToken,
      "frank",
      tokenBody.data.token,
    );
    expect(first.status).toBe(201);

    const second = await consumeToken(
      app,
      consumer.accessToken,
      "frank",
      tokenBody.data.token,
    );
    expect(second.status).toBe(401);
  });

  it("expires after 300 seconds", async () => {
    vi.useFakeTimers();
    const owner = await registerUser(app, "henry");
    const consumer = await registerUser(app, "iris");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);

    vi.advanceTimersByTime(301 * 1000);

    const res = await consumeToken(
      app,
      consumer.accessToken,
      "henry",
      tokenBody.data.token,
    );
    expect(res.status).toBe(401);
  });

  it("rejects consuming your own token", async () => {
    const owner = await registerUser(app, "jack");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);

    const res = await consumeToken(
      app,
      owner.accessToken,
      "jack",
      tokenBody.data.token,
    );
    expect(res.status).toBe(409);
  });

  it("gives the same generic error for an unknown username as an invalid token", async () => {
    const consumer = await registerUser(app, "kelly");
    await registerUser(app, "kelly_target");

    const unknownUserRes = await consumeToken(
      app,
      consumer.accessToken,
      "nobody-registered",
      "some-token",
    );
    const invalidTokenRes = await consumeToken(
      app,
      consumer.accessToken,
      "kelly_target",
      "some-other-token",
    );

    expect(unknownUserRes.status).toBe(invalidTokenRes.status);
    const [a, b] = await Promise.all([
      unknownUserRes.json(),
      invalidTokenRes.json(),
    ]);
    expect((a as { error: { message: string } }).error.message).toBe(
      (b as { error: { message: string } }).error.message,
    );
  });

  it("requires authentication", async () => {
    const res = await app.request("/social/friendships", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "anyone", token: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("is rate limited after 10 attempts from the same IP within the window", async () => {
    const consumer = await registerUser(app, "liam");
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await consumeToken(app, consumer.accessToken, "nobody", "x");
    }
    expect(last?.status).toBe(429);
  });
});

describe("GET /social/friendships", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("lists friendships for the authenticated user, unaffected by consume's rate limit", async () => {
    const owner = await registerUser(app, "maya");
    const consumer = await registerUser(app, "noah");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);
    await consumeToken(app, consumer.accessToken, "maya", tokenBody.data.token);

    const res = await app.request("/social/friendships", {
      headers: { authorization: `Bearer ${consumer.accessToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { friend: { username: string } }[];
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.friend.username).toBe("maya");
  });

  it("requires authentication", async () => {
    const res = await app.request("/social/friendships");
    expect(res.status).toBe(401);
  });
});

describe("DELETE /social/friendships/:id", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("either participant can remove the friendship", async () => {
    const owner = await registerUser(app, "olivia");
    const consumer = await registerUser(app, "peter");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);
    const consumeRes = await consumeToken(
      app,
      consumer.accessToken,
      "olivia",
      tokenBody.data.token,
    );
    const { data: friendship } = (await consumeRes.json()) as {
      data: { id: string };
    };

    const deleteRes = await app.request(
      `/social/friendships/${friendship.id}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${owner.accessToken}` },
      },
    );
    expect(deleteRes.status).toBe(200);

    const listRes = await app.request("/social/friendships", {
      headers: { authorization: `Bearer ${consumer.accessToken}` },
    });
    const { data } = (await listRes.json()) as { data: unknown[] };
    expect(data).toHaveLength(0);
  });

  it("rejects removal by a non-participant", async () => {
    const owner = await registerUser(app, "quinn");
    const consumer = await registerUser(app, "rachel");
    const outsider = await registerUser(app, "sam");
    const { body: tokenBody } = await generateToken(app, owner.accessToken);
    const consumeRes = await consumeToken(
      app,
      consumer.accessToken,
      "quinn",
      tokenBody.data.token,
    );
    const { data: friendship } = (await consumeRes.json()) as {
      data: { id: string };
    };

    const deleteRes = await app.request(
      `/social/friendships/${friendship.id}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${outsider.accessToken}` },
      },
    );
    expect(deleteRes.status).toBe(403);
  });

  it("returns 404 for a nonexistent friendship", async () => {
    const user = await registerUser(app, "tina");
    const res = await app.request(
      "/social/friendships/00000000-0000-0000-0000-000000000000",
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${user.accessToken}` },
      },
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /openapi.json", () => {
  it("documents every /social route", async () => {
    const { app } = setup();
    const res = await app.request("/openapi.json");
    const doc = (await res.json()) as { paths: Record<string, unknown> };

    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/social/blue-moon-tokens",
        "/social/friendships",
        "/social/friendships/{id}",
      ]),
    );
  });
});
