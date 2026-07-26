import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Context } from "hono";
import { REFRESH_TOKEN_TTL_MS } from "../../domain/identity/rules/session-lifetime.js";

/**
 * Refresh token transport -- see docs/security/Session-Management.md
 * "Transport" section. httpOnly + Secure (outside development) +
 * SameSite=Lax, scoped to /auth so it's never sent to unrelated
 * routes. Never readable from client-side JavaScript.
 */
const REFRESH_TOKEN_COOKIE = "bm_refresh";

export function setRefreshTokenCookie(
  c: Context,
  token: string,
  isProduction: boolean,
): void {
  setCookie(c, REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/auth",
    maxAge: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
  });
}

export function getRefreshTokenCookie(c: Context): string | undefined {
  return getCookie(c, REFRESH_TOKEN_COOKIE);
}

export function clearRefreshTokenCookie(
  c: Context,
  isProduction: boolean,
): void {
  deleteCookie(c, REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    path: "/auth",
  });
}
