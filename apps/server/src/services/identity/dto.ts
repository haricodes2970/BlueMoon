import type { User } from "../../domain/identity/entities/user.js";

/**
 * The only user shape allowed to cross out of this layer. Deliberately
 * excludes credentialHash, failedLoginCount, and lockedUntil -- those
 * are internal to the Identity domain, never serialized to a caller.
 */
export interface PublicUser {
  id: string;
  username: string;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

export interface AuthResult {
  user: PublicUser;
  sessionId: string;
  deviceId: string;
  deviceTrusted: boolean;
  accessToken: string;
  refreshToken: string;
}
