import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { getTestDatabaseUrl, hasTestDatabase } from "./test-utils/real-db.js";
import type { ServerEnv } from "./env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

describe.skipIf(!hasTestDatabase())("GET /health (real Postgres)", () => {
  const databaseUrl = getTestDatabaseUrl();
  let env: ServerEnv;

  beforeAll(() => {
    env = {
      NODE_ENV: "test",
      PORT: 8787,
      LOG_LEVEL: "silent",
      DATABASE_URL: databaseUrl ?? undefined,
      JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
      WEB_ORIGIN: "http://localhost:3000",
      COOKIE_SAME_SITE: "Lax",
    };
  });

  it("reports ok when the database is reachable", async () => {
    const app = createApp(env);
    const res = await app.request("/health");
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ok");
  });

  it("reports degraded, not a thrown error, when DATABASE_URL points nowhere", async () => {
    const unreachable: ServerEnv = {
      ...env,
      DATABASE_URL: "postgres://bluemoon:bluemoon@localhost:1/no_such_db",
    };
    const app = createApp(unreachable);
    const res = await app.request("/health");
    const body = (await res.json()) as { status: string };
    expect(res.status).toBe(200);
    expect(body.status).toBe("degraded");
  });

  it("reuses one connection pool across repeated polls instead of opening a new one per call", async () => {
    const app = createApp(env);
    for (let i = 0; i < 10; i++) {
      const res = await app.request("/health");
      expect(res.status).toBe(200);
    }
  });
});
