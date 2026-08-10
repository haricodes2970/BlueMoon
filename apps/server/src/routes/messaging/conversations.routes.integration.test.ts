import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
import type { ServerEnv } from "../../env.js";

/**
 * Milestone 1.0: end-to-end HTTP-layer coverage of Messaging against
 * a real PostgreSQL instance, same pattern as
 * friendships.routes.integration.test.ts (Milestone 0.9) -- every
 * container wraps real Drizzle repositories sharing one `db`, exactly
 * as app.ts wires them in production.
 */
describe.skipIf(!hasTestDatabase())(
  "Messaging HTTP API (real Postgres)",
  () => {
    const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";
    let db: Database;

    function setup() {
      const identityContainer = createIdentityContainer(db, TEST_SECRET);
      const socialContainer = createSocialContainer(db);
      const messagingContainer = createMessagingContainer(db);
      const env: ServerEnv = {
        NODE_ENV: "test",
        PORT: 8787,
        LOG_LEVEL: "silent",
        JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
        WEB_ORIGIN: "http://localhost:3000",
      };
      const app = createApp(env, {
        identityContainer,
        socialContainer,
        messagingContainer,
      });
      return { app };
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

    beforeAll(() => {
      db = createTestDatabase();
    });

    beforeEach(async () => {
      await resetAllTables(db);
    });

    afterAll(async () => {
      await db.$client.end();
    });

    it("creates a conversation between friends and persists it in Postgres", async () => {
      const { app } = setup();
      const a = await registerUser(app, "pgmalice");
      const b = await registerUser(app, "pgmbob");
      await befriend(app, a, b, "pgmalice");

      const res = await app.request("/messaging/conversations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${a.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ otherUserId: b.userId }),
      });
      expect(res.status).toBe(201);

      const listRes = await app.request("/messaging/conversations", {
        headers: { authorization: `Bearer ${b.accessToken}` },
      });
      const { data } = (await listRes.json()) as { data: unknown[] };
      expect(data).toHaveLength(1);
    });

    it("rejects a conversation between non-friends", async () => {
      const { app } = setup();
      const a = await registerUser(app, "pgmcarol");
      const b = await registerUser(app, "pgmdave");

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

    it("concurrent conversation creation from both sides resolves to one row in Postgres", async () => {
      const { app } = setup();
      const a = await registerUser(app, "pgmerin");
      const b = await registerUser(app, "pgmfrank");
      await befriend(app, a, b, "pgmerin");

      const create = (accessToken: string, otherUserId: string) =>
        app.request("/messaging/conversations", {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ otherUserId }),
        });

      const [resA, resB] = await Promise.all([
        create(a.accessToken, b.userId),
        create(b.accessToken, a.userId),
      ]);
      const bodyA = (await resA.json()) as { data: { id: string } };
      const bodyB = (await resB.json()) as { data: { id: string } };
      expect(bodyA.data.id).toBe(bodyB.data.id);
    });

    it("lists persisted message history for a participant", async () => {
      const { app } = setup();
      const a = await registerUser(app, "pgmgrace");
      const b = await registerUser(app, "pgmharry");
      await befriend(app, a, b, "pgmgrace");

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

      const messagingContainer = createMessagingContainer(db);
      await messagingContainer.sendMessage({
        senderId: a.userId,
        conversationId: conversation.id,
        content: "persisted in postgres",
      });

      const res = await app.request(
        `/messaging/conversations/${conversation.id}/messages`,
        { headers: { authorization: `Bearer ${b.accessToken}` } },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { content: string }[] };
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.content).toBe("persisted in postgres");
    });

    it("rejects a non-participant reading message history", async () => {
      const { app } = setup();
      const a = await registerUser(app, "pgmivan");
      const b = await registerUser(app, "pgmjulia");
      const outsider = await registerUser(app, "pgmkevin");
      await befriend(app, a, b, "pgmivan");

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

      const res = await app.request(
        `/messaging/conversations/${conversation.id}/messages`,
        { headers: { authorization: `Bearer ${outsider.accessToken}` } },
      );
      expect(res.status).toBe(403);
    });
  },
);
