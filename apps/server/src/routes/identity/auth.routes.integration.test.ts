import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@bluemoon/database";
import { createApp } from "../../app.js";
import { createIdentityContainer } from "../../container.js";
import {
  createTestDatabase,
  hasTestDatabase,
  resetAllTables,
} from "../../test-utils/real-db.js";
import type { ServerEnv } from "../../env.js";

/**
 * Milestone 0.8: end-to-end HTTP-layer coverage of the security-
 * critical Identity flows against a real PostgreSQL instance -- same
 * routes/controllers/services as auth.routes.test.ts, but the
 * container wraps real Drizzle repositories instead of
 * fake-identity-container.ts's in-memory ones. Requires
 * TEST_DATABASE_URL or DATABASE_URL; skips entirely otherwise.
 */
describe.skipIf(!hasTestDatabase())("Identity HTTP API (real Postgres)", () => {
  const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";
  let db: Database;

  function setup() {
    const container = createIdentityContainer(db, TEST_SECRET);
    const env: ServerEnv = {
      NODE_ENV: "test",
      PORT: 8787,
      LOG_LEVEL: "silent",
      JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
    };
    const app = createApp(env, { identityContainer: container });
    return { app };
  }

  function refreshCookieFrom(res: Response): string {
    const setCookie = res.headers.get("set-cookie") ?? "";
    const match = /bm_refresh=([^;]+)/.exec(setCookie);
    if (!match?.[1]) throw new Error("no refresh cookie in response");
    return match[1];
  }

  async function registerUser(app: ReturnType<typeof setup>["app"]) {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "482913",
        deviceFingerprint: "device-1",
        deviceLabel: "laptop",
      }),
    });
    const body = (await res.json()) as {
      success: true;
      data: { user: { id: string }; accessToken: string };
    };
    return { res, body, refreshCookie: refreshCookieFrom(res) };
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

  it("registers a user in Postgres and rejects a duplicate username", async () => {
    const { app } = setup();
    const { res } = await registerUser(app);
    expect(res.status).toBe(201);

    const dupe = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "111222",
        deviceFingerprint: "device-2",
      }),
    });
    expect(dupe.status).toBe(409);
  });

  it("locks the account after 5 failed attempts (persisted lockout)", async () => {
    const { app } = setup();
    await registerUser(app);

    for (let i = 0; i < 5; i++) {
      await app.request("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "srihari",
          credential: "000000",
          deviceFingerprint: "device-1",
        }),
      });
    }

    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "482913",
        deviceFingerprint: "device-1",
      }),
    });

    expect(res.status).toBe(403);
  });

  it("rotates the refresh token against Postgres and rejects reuse by killing the session", async () => {
    const { app } = setup();
    const { refreshCookie } = await registerUser(app);

    const first = await app.request("/auth/refresh", {
      method: "POST",
      headers: { cookie: `bm_refresh=${refreshCookie}` },
    });
    expect(first.status).toBe(200);
    const rotatedForward = refreshCookieFrom(first);

    const reuse = await app.request("/auth/refresh", {
      method: "POST",
      headers: { cookie: `bm_refresh=${refreshCookie}` },
    });
    expect(reuse.status).toBe(401);

    const afterKill = await app.request("/auth/refresh", {
      method: "POST",
      headers: { cookie: `bm_refresh=${rotatedForward}` },
    });
    expect(afterKill.status).toBe(401);
  });

  it("creates and revokes a trusted device via the API, persisted in Postgres", async () => {
    const { app } = setup();
    const { body } = await registerUser(app);
    const accessToken = body.data.accessToken;

    const devicesRes = await app.request("/auth/devices", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const { data: userDevices } = (await devicesRes.json()) as {
      data: { id: string }[];
    };
    const deviceId = userDevices[0]?.id;

    const trustRes = await app.request("/auth/trust-device", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ deviceId }),
    });
    expect(trustRes.status).toBe(201);
    const { data: trust } = (await trustRes.json()) as {
      data: { trustId: string };
    };

    const deleteRes = await app.request(
      `/auth/trust-device/${trust.trustId}?deviceId=${deviceId}`,
      { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } },
    );
    expect(deleteRes.status).toBe(200);
  });

  it("change-credential invalidates the old credential and the current session in Postgres", async () => {
    const { app } = setup();
    const { body } = await registerUser(app);
    const accessToken = body.data.accessToken;

    const changeRes = await app.request("/auth/change-credential", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        currentCredential: "482913",
        newCredential: "739201",
      }),
    });
    expect(changeRes.status).toBe(200);

    const oldLoginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "482913",
        deviceFingerprint: "device-1",
      }),
    });
    expect(oldLoginRes.status).toBe(401);

    const newLoginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "739201",
        deviceFingerprint: "device-1",
      }),
    });
    expect(newLoginRes.status).toBe(200);
  });

  it("logout revokes the session and clears the cookie", async () => {
    const { app } = setup();
    const { body } = await registerUser(app);

    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${body.data.accessToken}` },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("bm_refresh=;");
  });
});
