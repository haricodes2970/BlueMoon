import {
  isRefreshTokenActive,
  isSessionActive,
} from "../../domain/identity/entities/session.js";
import {
  RefreshTokenReuseError,
  SessionExpiredError,
} from "../../domain/identity/errors.js";
import {
  computeRefreshTokenExpiry,
  isIdleTimedOut,
} from "../../domain/identity/rules/session-lifetime.js";
import type { AccessTokenService } from "../../infrastructure/identity/access-token.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../infrastructure/identity/refresh-token.js";
import type { RefreshTokenRepository } from "../../repositories/identity/refresh-token.repository.js";
import type { SessionRepository } from "../../repositories/identity/session.repository.js";

export interface RefreshSessionDependencies {
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  accessTokens: AccessTokenService;
  audit: AuditWriter;
  now?: () => Date;
}

export interface RefreshSessionInput {
  refreshToken: string;
  ipAddress: string;
}

export interface RefreshSessionResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/**
 * Rotates the refresh token on every use. See
 * docs/security/Session-Management.md for the reuse-detection
 * rationale: a revoked token being presented again means it was
 * already rotated once before -- evidence of theft, not just a race
 * -- so the entire session is killed, not just this request rejected.
 */
export function createRefreshSessionUseCase(deps: RefreshSessionDependencies) {
  const now = deps.now ?? (() => new Date());

  async function killSessionForReuse(sessionId: string, ipAddress: string) {
    await deps.sessions.revoke(sessionId);
    await deps.refreshTokens.revokeBySession(sessionId);
    await deps.audit.record({
      type: "session_revoked",
      userId: null,
      ipAddress,
      metadata: { reason: "refresh_token_reuse", sessionId },
    });
  }

  return async function refreshSession(
    input: RefreshSessionInput,
  ): Promise<RefreshSessionResult> {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const existing = await deps.refreshTokens.findByHash(tokenHash);
    if (!existing) {
      throw new SessionExpiredError();
    }

    if (!isRefreshTokenActive(existing, now())) {
      if (existing.revokedAt !== null) {
        await killSessionForReuse(existing.sessionId, input.ipAddress);
        throw new RefreshTokenReuseError();
      }
      throw new SessionExpiredError();
    }

    const session = await deps.sessions.findById(existing.sessionId);
    if (!session || !isSessionActive(session, now())) {
      throw new SessionExpiredError();
    }

    if (isIdleTimedOut(session.lastActiveAt, now())) {
      await deps.sessions.revoke(session.id);
      await deps.refreshTokens.revokeBySession(session.id);
      throw new SessionExpiredError();
    }

    const revoked = await deps.refreshTokens.revoke(existing.id);
    if (!revoked) {
      // Lost a concurrent rotation race: another request revoked this
      // exact token between our findByHash and our revoke. Same signal
      // as detected reuse (two presentations of one token), so respond
      // identically -- kill the session rather than silently letting
      // this request also mint a second valid child of the same parent.
      await killSessionForReuse(session.id, input.ipAddress);
      throw new RefreshTokenReuseError();
    }

    const rawNewToken = generateRefreshToken();
    await deps.refreshTokens.create({
      sessionId: session.id,
      tokenHash: hashRefreshToken(rawNewToken),
      expiresAt: computeRefreshTokenExpiry(now()),
      rotatedFromId: existing.id,
    });

    await deps.sessions.touchLastActive(session.id);
    const accessToken = await deps.accessTokens.sign({
      userId: session.userId,
      sessionId: session.id,
      deviceId: session.deviceId,
    });

    return { accessToken, refreshToken: rawNewToken, sessionId: session.id };
  };
}
