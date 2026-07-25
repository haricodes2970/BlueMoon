import { errors, jwtVerify, SignJWT } from "jose";
import { ACCESS_TOKEN_TTL_MS } from "../../domain/identity/rules/session-lifetime.js";

export interface AccessTokenPayload {
  userId: string;
  sessionId: string;
  deviceId: string;
}

export interface AccessTokenService {
  sign(payload: AccessTokenPayload): Promise<string>;
  /** Returns null on any invalid/expired/malformed token -- never throws for that. */
  verify(token: string): Promise<AccessTokenPayload | null>;
}

/**
 * Short-lived, stateless (HS256) access tokens -- see
 * docs/security/Session-Management.md. `secret` must be at least 32
 * bytes; validated by the caller's env schema, not here.
 */
export function createAccessTokenService(secret: string): AccessTokenService {
  const key = new TextEncoder().encode(secret);

  return {
    async sign(payload) {
      return new SignJWT({ sid: payload.sessionId, did: payload.deviceId })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.userId)
        .setIssuedAt()
        .setExpirationTime(
          Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000),
        )
        .sign(key);
    },

    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key);
        if (
          typeof payload.sub !== "string" ||
          typeof payload.sid !== "string" ||
          typeof payload.did !== "string"
        ) {
          return null;
        }
        return {
          userId: payload.sub,
          sessionId: payload.sid,
          deviceId: payload.did,
        };
      } catch (error) {
        if (error instanceof errors.JOSEError) return null;
        throw error;
      }
    },
  };
}
