/**
 * Session lifetime constants -- see docs/security/Session-Management.md
 * for the full rationale. Kept as pure functions so they're unit
 * testable without a database or clock mocking library.
 */

/** Absolute maximum a session may live, regardless of activity. */
export const SESSION_MAX_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** If a session goes this long without a refresh, it's treated as expired. */
export const SESSION_IDLE_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** Access token lifetime (short-lived, stateless JWT). */
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Refresh token lifetime -- rotated on every use, so this is a ceiling, not a target. */
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * WebSocket connection ticket lifetime -- single-use, only needs to
 * survive the gap between "requested over HTTPS" and "presented on
 * the WS handshake", not a normal session window. See
 * docs/security/Messaging.md#websocket-authentication.
 */
export const WS_TICKET_TTL_MS = 30 * 1000; // 30 seconds

export function computeSessionExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + SESSION_MAX_LIFETIME_MS);
}

export function computeRefreshTokenExpiry(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_MS);
}

export function isIdleTimedOut(
  lastActiveAt: Date,
  now: Date = new Date(),
): boolean {
  return now.getTime() - lastActiveAt.getTime() > SESSION_IDLE_TIMEOUT_MS;
}
