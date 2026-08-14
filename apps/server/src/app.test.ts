import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createFakeIdentityContainer } from "./test-utils/fake-identity-container.js";
import type { ServerEnv } from "./env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

function setup() {
  const { container } = createFakeIdentityContainer(TEST_SECRET);
  const env: ServerEnv = {
    NODE_ENV: "test",
    PORT: 8787,
    LOG_LEVEL: "silent",
    JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
    WEB_ORIGIN: "http://localhost:3000",
    COOKIE_SAME_SITE: "Lax",
  };
  return createApp(env, { identityContainer: container });
}

describe("CORS", () => {
  it("reflects Access-Control-Allow-Origin for the configured WEB_ORIGIN", async () => {
    const app = setup();
    const res = await app.request("/health", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
  });

  it("does not reflect Access-Control-Allow-Origin for an unauthorized origin", async () => {
    const app = setup();
    const res = await app.request("/health", {
      headers: { origin: "https://evil.example" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("sets Access-Control-Allow-Credentials so the browser will send/store the refresh cookie", async () => {
    const app = setup();
    const res = await app.request("/health", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});
