import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "./env.js";

const TEST_SECRET = "test-secret-at-least-32-bytes-long!!";

function baseEnv(overrides: Record<string, string> = {}) {
  return {
    JWT_ACCESS_TOKEN_SECRET: TEST_SECRET,
    ...overrides,
  };
}

describe("serverEnvSchema", () => {
  it("accepts a minimal development config with no DATABASE_URL", () => {
    const result = serverEnvSchema.safeParse(
      baseEnv({ NODE_ENV: "development" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects production config missing DATABASE_URL", () => {
    const result = serverEnvSchema.safeParse(
      baseEnv({
        NODE_ENV: "production",
        WEB_ORIGIN: "https://app.example.com",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.join(".") === "DATABASE_URL"),
      ).toBe(true);
    }
  });

  it("rejects production config still using the localhost WEB_ORIGIN default", () => {
    const result = serverEnvSchema.safeParse(
      baseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@host:5432/db",
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.join(".") === "WEB_ORIGIN"),
      ).toBe(true);
    }
  });

  it("accepts a fully-specified production config", () => {
    const result = serverEnvSchema.safeParse(
      baseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@host:5432/db",
        WEB_ORIGIN: "https://app.example.com",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects COOKIE_SAME_SITE=None outside production", () => {
    const result = serverEnvSchema.safeParse(
      baseEnv({ NODE_ENV: "development", COOKIE_SAME_SITE: "None" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) => i.path.join(".") === "COOKIE_SAME_SITE",
        ),
      ).toBe(true);
    }
  });

  it("accepts COOKIE_SAME_SITE=None in production", () => {
    const result = serverEnvSchema.safeParse(
      baseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://user:pass@host:5432/db",
        WEB_ORIGIN: "https://app.example.com",
        COOKIE_SAME_SITE: "None",
      }),
    );
    expect(result.success).toBe(true);
  });
});
