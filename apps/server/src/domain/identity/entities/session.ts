export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export function isSessionActive(
  session: Pick<Session, "revokedAt" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (session.revokedAt !== null) return false;
  return session.expiresAt.getTime() > now.getTime();
}

export interface RefreshToken {
  id: string;
  sessionId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedFromId: string | null;
}

export function isRefreshTokenActive(
  token: Pick<RefreshToken, "revokedAt" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (token.revokedAt !== null) return false;
  return token.expiresAt.getTime() > now.getTime();
}
