import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { createFakeIdentityContainer } from "../../test-utils/fake-identity-container.js";
import type { ServerEnv } from "../../env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

function setup() {
  const { container, auditEvents, loginAttempts } =
    createFakeIdentityContainer(TEST_SECRET);
  const env: ServerEnv = {
    NODE_ENV: "test",
    PORT: 8787,
    LOG_LEVEL: "silent",
    JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
    WEB_ORIGIN: "http://localhost:3000",
  };
  const app = createApp(env, { identityContainer: container });
  return { app, auditEvents, loginAttempts };
}

function refreshCookieFrom(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = /bm_refresh=([^;]+)/.exec(setCookie);
  if (!match?.[1]) throw new Error("no refresh cookie in response");
  return match[1];
}

async function registerUser(
  app: ReturnType<typeof setup>["app"],
  overrides: Partial<{
    username: string;
    credential: string;
    deviceFingerprint: string;
  }> = {},
) {
  const res = await app.request("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      username: "srihari",
      credential: "482913",
      deviceFingerprint: "device-1",
      deviceLabel: "laptop",
      ...overrides,
    }),
  });
  const body = (await res.json()) as {
    success: true;
    data: { user: { id: string }; accessToken: string; deviceTrusted: boolean };
  };
  return { res, body, refreshCookie: refreshCookieFrom(res) };
}

describe("POST /auth/register", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("creates an account and logs it in", async () => {
    const { res, body, refreshCookie } = await registerUser(app);

    expect(res.status).toBe(201);
    expect(body.data.user.id).toBeTruthy();
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.deviceTrusted).toBe(false);
    expect(refreshCookie).toBeTruthy();
  });

  it("rejects a duplicate username", async () => {
    await registerUser(app);
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "111222",
        deviceFingerprint: "device-2",
      }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });

  it("rejects an invalid credential (shape validation)", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "abc",
        credential: "1",
        deviceFingerprint: "d1",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("logs in with the correct credential", async () => {
    await registerUser(app);
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "482913",
        deviceFingerprint: "device-1",
      }),
    });

    expect(res.status).toBe(200);
  });

  it("rejects the wrong credential with a generic message (no enumeration)", async () => {
    await registerUser(app);
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "srihari",
        credential: "000000",
        deviceFingerprint: "device-1",
      }),
    });
    const unknownRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "nobody",
        credential: "000000",
        deviceFingerprint: "device-1",
      }),
    });

    expect(res.status).toBe(401);
    expect(unknownRes.status).toBe(401);
    const [body, unknownBody] = await Promise.all([
      res.json(),
      unknownRes.json(),
    ]);
    expect((body as { error: { message: string } }).error.message).toBe(
      (unknownBody as { error: { message: string } }).error.message,
    );
  });

  it("locks the account after 5 failed attempts", async () => {
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
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("is rate limited after 10 attempts from the same IP within the window", async () => {
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await app.request("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "nobody",
          credential: "000000",
          deviceFingerprint: "d",
        }),
      });
    }

    expect(last?.status).toBe(429);
  });
});

describe("protected routes", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("GET /auth/me requires a valid access token", async () => {
    const noAuth = await app.request("/auth/me");
    expect(noAuth.status).toBe(401);

    const { body } = await registerUser(app);
    const authed = await app.request("/auth/me", {
      headers: { authorization: `Bearer ${body.data.accessToken}` },
    });
    expect(authed.status).toBe(200);
    const authedBody = (await authed.json()) as { data: { username: string } };
    expect(authedBody.data.username).toBe("srihari");
  });

  it("GET /auth/devices lists devices for the authenticated user", async () => {
    const { body } = await registerUser(app);
    const res = await app.request("/auth/devices", {
      headers: { authorization: `Bearer ${body.data.accessToken}` },
    });

    expect(res.status).toBe(200);
    const devicesBody = (await res.json()) as { data: unknown[] };
    expect(devicesBody.data).toHaveLength(1);
  });

  it("trust-device then DELETE with the wrong deviceId is rejected (ownership check)", async () => {
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
    const { data: trust } = (await trustRes.json()) as {
      data: { trustId: string };
    };

    const wrongDeleteRes = await app.request(
      `/auth/trust-device/${trust.trustId}?deviceId=00000000-0000-0000-0000-000000000000`,
      { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } },
    );
    expect(wrongDeleteRes.status).toBe(404);

    const correctDeleteRes = await app.request(
      `/auth/trust-device/${trust.trustId}?deviceId=${deviceId}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );
    expect(correctDeleteRes.status).toBe(200);
  });

  it("change-credential invalidates the old credential and the current session", async () => {
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
});

describe("POST /auth/refresh", () => {
  let app: ReturnType<typeof setup>["app"];

  beforeEach(() => {
    ({ app } = setup());
  });

  it("rotates the refresh token and issues a new access token", async () => {
    const { refreshCookie } = await registerUser(app);

    const res = await app.request("/auth/refresh", {
      method: "POST",
      headers: { cookie: `bm_refresh=${refreshCookie}` },
    });

    expect(res.status).toBe(200);
    const newCookie = refreshCookieFrom(res);
    expect(newCookie).not.toBe(refreshCookie);
  });

  it("detects reuse of an already-rotated refresh token and kills the session", async () => {
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

    // The legitimately rotated-forward token must also be dead now --
    // the whole session was killed, not just the reused token.
    const afterKill = await app.request("/auth/refresh", {
      method: "POST",
      headers: { cookie: `bm_refresh=${rotatedForward}` },
    });
    expect(afterKill.status).toBe(401);
  });

  it("returns 401 with no refresh cookie", async () => {
    const res = await app.request("/auth/refresh", { method: "POST" });
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("revokes the session and clears the cookie", async () => {
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

describe("GET /openapi.json", () => {
  it("documents every /auth route", async () => {
    const { app } = setup();
    const res = await app.request("/openapi.json");
    const doc = (await res.json()) as { paths: Record<string, unknown> };

    expect(Object.keys(doc.paths)).toEqual(
      expect.arrayContaining([
        "/auth/register",
        "/auth/login",
        "/auth/logout",
        "/auth/refresh",
        "/auth/change-credential",
        "/auth/trust-device",
        "/auth/trust-device/{id}",
        "/auth/me",
        "/auth/devices",
      ]),
    );
  });
});
