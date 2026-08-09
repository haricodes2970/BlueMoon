import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@bluemoon/database";
import { createApp } from "../../app.js";
import { createIdentityContainer } from "../../container.js";
import { createSocialContainer } from "../../social-container.js";
import {
  createTestDatabase,
  hasTestDatabase,
  resetAllTables,
} from "../../test-utils/real-db.js";
import type { ServerEnv } from "../../env.js";

/**
 * Milestone 0.9: end-to-end HTTP-layer coverage of the Social flows
 * against a real PostgreSQL instance -- same routes/controllers/
 * services as friendships.routes.test.ts, but both containers wrap
 * real Drizzle repositories sharing one `db`, exactly as app.ts wires
 * them in production. Requires TEST_DATABASE_URL or DATABASE_URL;
 * skips entirely otherwise.
 */
describe.skipIf(!hasTestDatabase())("Social HTTP API (real Postgres)", () => {
  const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";
  let db: Database;

  function setup() {
    const identityContainer = createIdentityContainer(db, TEST_SECRET);
    const socialContainer = createSocialContainer(db);
    const env: ServerEnv = {
      NODE_ENV: "test",
      PORT: 8787,
      LOG_LEVEL: "silent",
      JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
    };
    const app = createApp(env, { identityContainer, socialContainer });
    return { app };
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

  beforeAll(() => {
    db = createTestDatabase();
  });

  beforeEach(async () => {
    await resetAllTables(db);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("generates a token, consumes it, and persists the friendship in Postgres", async () => {
    const { app } = setup();
    const owner = await registerUser(app, "pgowner");
    const consumer = await registerUser(app, "pgconsumer");

    const genRes = await app.request("/social/blue-moon-tokens", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    expect(genRes.status).toBe(201);
    const { data: tokenData } = (await genRes.json()) as {
      data: { token: string };
    };

    const consumeRes = await app.request("/social/friendships", {
      method: "POST",
      headers: {
        authorization: `Bearer ${consumer.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ username: "pgowner", token: tokenData.token }),
    });
    expect(consumeRes.status).toBe(201);

    const listRes = await app.request("/social/friendships", {
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    const { data: friendships } = (await listRes.json()) as {
      data: { friend: { username: string } }[];
    };
    expect(friendships).toHaveLength(1);
    expect(friendships[0]?.friend.username).toBe("pgconsumer");
  });

  it("rejects reusing an already-consumed token", async () => {
    const { app } = setup();
    const owner = await registerUser(app, "pgowner2");
    const consumerA = await registerUser(app, "pgconsumera");
    const consumerB = await registerUser(app, "pgconsumerb");

    const genRes = await app.request("/social/blue-moon-tokens", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    const { data: tokenData } = (await genRes.json()) as {
      data: { token: string };
    };

    const first = await app.request("/social/friendships", {
      method: "POST",
      headers: {
        authorization: `Bearer ${consumerA.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ username: "pgowner2", token: tokenData.token }),
    });
    expect(first.status).toBe(201);

    const second = await app.request("/social/friendships", {
      method: "POST",
      headers: {
        authorization: `Bearer ${consumerB.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ username: "pgowner2", token: tokenData.token }),
    });
    expect(second.status).toBe(401);
  });

  it("concurrent consumption via HTTP: exactly one request succeeds", async () => {
    const { app } = setup();
    const owner = await registerUser(app, "pgowner3");
    const consumerA = await registerUser(app, "pgconsumerc");
    const consumerB = await registerUser(app, "pgconsumerd");

    const genRes = await app.request("/social/blue-moon-tokens", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    const { data: tokenData } = (await genRes.json()) as {
      data: { token: string };
    };

    const consume = (accessToken: string) =>
      app.request("/social/friendships", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ username: "pgowner3", token: tokenData.token }),
      });

    const [resA, resB] = await Promise.all([
      consume(consumerA.accessToken),
      consume(consumerB.accessToken),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 401]);
  });

  it("removes a friendship via the API, persisted in Postgres", async () => {
    const { app } = setup();
    const owner = await registerUser(app, "pgowner4");
    const consumer = await registerUser(app, "pgconsumere");

    const genRes = await app.request("/social/blue-moon-tokens", {
      method: "POST",
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    const { data: tokenData } = (await genRes.json()) as {
      data: { token: string };
    };
    const consumeRes = await app.request("/social/friendships", {
      method: "POST",
      headers: {
        authorization: `Bearer ${consumer.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ username: "pgowner4", token: tokenData.token }),
    });
    const { data: friendship } = (await consumeRes.json()) as {
      data: { id: string };
    };

    const deleteRes = await app.request(
      `/social/friendships/${friendship.id}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${consumer.accessToken}` },
      },
    );
    expect(deleteRes.status).toBe(200);

    const listRes = await app.request("/social/friendships", {
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    const { data } = (await listRes.json()) as { data: unknown[] };
    expect(data).toHaveLength(0);
  });
});
