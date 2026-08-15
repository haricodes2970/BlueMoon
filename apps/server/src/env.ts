import { z } from "zod";
import { extendEnvSchema, loadEnv } from "@bluemoon/config";

const DEV_DEFAULT_WEB_ORIGIN = "http://localhost:3000";

export const serverEnvSchema = extendEnvSchema({
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  /** Signs Identity access tokens (JWT, HS256) -- see ADR-0024. */
  JWT_ACCESS_TOKEN_SECRET: z.string().min(32),
  /** Origin allowed to call this API cross-origin -- apps/web runs on a different port/host. */
  WEB_ORIGIN: z.string().url().default(DEV_DEFAULT_WEB_ORIGIN),
  /**
   * `bm_refresh` cookie's SameSite attribute (see
   * infrastructure/identity/cookies.ts). "Lax" is correct when
   * apps/web and apps/server share a registrable domain (e.g.
   * app.example.com / api.example.com); browsers never attach a Lax
   * cookie to a cross-site fetch(), so a deployment across two
   * unrelated domains (default Vercel/Render domains) needs "None"
   * instead -- see docs/deployment/README.md and
   * ADR-0031. Defaults to the stricter "Lax"; "None" must be an
   * explicit operator choice, not a silent default.
   */
  COOKIE_SAME_SITE: z.enum(["Lax", "None"]).default("Lax"),
}).superRefine((env, ctx) => {
  if (env.COOKIE_SAME_SITE === "None" && env.NODE_ENV !== "production") {
    // Browsers reject `SameSite=None` without `Secure`; cookies.ts
    // only sets Secure when NODE_ENV is production, so outside
    // production this combination would silently produce a cookie no
    // browser will ever store.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["COOKIE_SAME_SITE"],
      message:
        "COOKIE_SAME_SITE=None requires NODE_ENV=production (the cookie must also be Secure, which cookies.ts only sets in production)",
    });
  }

  // Fail fast in production only -- development/test intentionally
  // stay permissive (localhost, no database) so the workspace keeps
  // working without a full production configuration on every machine.
  if (env.NODE_ENV !== "production") return;

  if (!env.DATABASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message:
        'DATABASE_URL is required in production -- without it, the server starts but silently mounts none of /auth, /social, /messaging (see app.ts) while /health still reports "ok"',
    });
  }

  if (env.WEB_ORIGIN === DEV_DEFAULT_WEB_ORIGIN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["WEB_ORIGIN"],
      message:
        "WEB_ORIGIN must be set to the real production frontend origin, not the localhost development default",
    });
  }
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function loadServerEnv(
  source: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return loadEnv(serverEnvSchema, source);
}
