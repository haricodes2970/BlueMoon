/**
 * Account lockout policy after repeated failed login attempts. Pure
 * functions -- see docs/security/Authentication.md for rationale.
 */

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function shouldLockAccount(failedLoginCount: number): boolean {
  return failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS;
}

export function computeLockoutExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + LOCKOUT_DURATION_MS);
}
