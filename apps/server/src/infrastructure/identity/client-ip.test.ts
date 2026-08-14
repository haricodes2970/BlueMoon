import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { getClientIp } from "./client-ip.js";

function appReturningClientIp() {
  const app = new Hono();
  app.get("/", (c) => c.text(getClientIp(c)));
  return app;
}

describe("getClientIp", () => {
  it('returns "unknown" when x-forwarded-for is absent', async () => {
    const app = appReturningClientIp();
    const res = await app.request("/");
    expect(await res.text()).toBe("unknown");
  });

  it("trusts the last entry (the proxy-appended hop), not the first (client-supplied)", async () => {
    const app = appReturningClientIp();
    // Railway's edge appends the real client IP as the last hop;
    // everything before it is whatever the client itself sent and
    // must not be trusted for rate limiting.
    const res = await app.request("/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(await res.text()).toBe("5.6.7.8");
  });

  it("returns the single entry when there is only one hop", async () => {
    const app = appReturningClientIp();
    const res = await app.request("/", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    expect(await res.text()).toBe("9.9.9.9");
  });
});
