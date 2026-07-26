import { isLocked } from "../../domain/identity/entities/user.js";
import { isTrustActive } from "../../domain/identity/entities/device.js";
import {
  AccountLockedError,
  InvalidLoginError,
} from "../../domain/identity/errors.js";
import {
  computeLockoutExpiry,
  shouldLockAccount,
} from "../../domain/identity/rules/lockout-policy.js";
import {
  computeRefreshTokenExpiry,
  computeSessionExpiry,
} from "../../domain/identity/rules/session-lifetime.js";
import type { AccessTokenService } from "../../infrastructure/identity/access-token.js";
import type { AuditWriter } from "../../infrastructure/identity/audit-writer.js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../infrastructure/identity/refresh-token.js";
import type { DeviceRepository } from "../../repositories/identity/device.repository.js";
import type { LoginAttemptRepository } from "../../repositories/identity/login-attempt.repository.js";
import type { RefreshTokenRepository } from "../../repositories/identity/refresh-token.repository.js";
import type { SessionRepository } from "../../repositories/identity/session.repository.js";
import type { TrustedDeviceRepository } from "../../repositories/identity/trusted-device.repository.js";
import type { UserRepository } from "../../repositories/identity/user.repository.js";
import { toPublicUser, type AuthResult } from "./dto.js";

export interface LoginDependencies {
  users: UserRepository;
  devices: DeviceRepository;
  trustedDevices: TrustedDeviceRepository;
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  loginAttempts: LoginAttemptRepository;
  verifyCredential: (hash: string, raw: string) => Promise<boolean>;
  accessTokens: AccessTokenService;
  audit: AuditWriter;
  now?: () => Date;
}

export interface LoginInput {
  username: string;
  credential: string;
  deviceFingerprint: string;
  deviceLabel: string | null;
  ipAddress: string;
}

/**
 * Login is intentionally one large orchestration function rather than
 * split further -- every step (lockout check, credential verify,
 * failure recording, device/session/token issuance) depends on the
 * previous step's result and all of it must be one coherent flow to
 * reason about from an audit/security perspective. See
 * docs/security/Authentication.md.
 */
export function createLoginUseCase(deps: LoginDependencies) {
  const now = deps.now ?? (() => new Date());

  return async function login(input: LoginInput): Promise<AuthResult> {
    const usernameNormalized = input.username.trim().toLowerCase();
    const user = await deps.users.findByUsername(usernameNormalized);

    if (!user) {
      await deps.loginAttempts.record({
        usernameAttempted: usernameNormalized,
        userId: null,
        ipAddress: input.ipAddress,
        succeeded: false,
        reason: "user_not_found",
      });
      await deps.audit.record({
        type: "login_failed",
        userId: null,
        ipAddress: input.ipAddress,
      });
      throw new InvalidLoginError();
    }

    if (isLocked(user, now())) {
      await deps.loginAttempts.record({
        usernameAttempted: usernameNormalized,
        userId: user.id,
        ipAddress: input.ipAddress,
        succeeded: false,
        reason: "locked",
      });
      // Non-null by construction: isLocked() only returns true when lockedUntil is set.
      throw new AccountLockedError(user.lockedUntil as Date);
    }

    const credentialValid = await deps.verifyCredential(
      user.credentialHash,
      input.credential,
    );
    if (!credentialValid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil = shouldLockAccount(failedLoginCount)
        ? computeLockoutExpiry(now())
        : null;
      await deps.users.recordFailedLogin(
        user.id,
        failedLoginCount,
        lockedUntil,
      );
      await deps.loginAttempts.record({
        usernameAttempted: usernameNormalized,
        userId: user.id,
        ipAddress: input.ipAddress,
        succeeded: false,
        reason: "invalid_credential",
      });
      await deps.audit.record({
        type: "login_failed",
        userId: user.id,
        ipAddress: input.ipAddress,
      });
      throw new InvalidLoginError();
    }

    await deps.users.resetFailedLogins(user.id);

    let device = await deps.devices.findByUserAndFingerprint(
      user.id,
      input.deviceFingerprint,
    );
    if (device) {
      await deps.devices.touchLastSeen(device.id);
    } else {
      device = await deps.devices.create({
        userId: user.id,
        fingerprint: input.deviceFingerprint,
        label: input.deviceLabel,
      });
    }

    const trust = await deps.trustedDevices.findActiveByUserAndDevice(
      user.id,
      device.id,
    );
    const deviceTrusted = trust !== null && isTrustActive(trust, now());

    const issuedAt = now();
    const session = await deps.sessions.create({
      userId: user.id,
      deviceId: device.id,
      expiresAt: computeSessionExpiry(issuedAt),
    });

    const rawRefreshToken = generateRefreshToken();
    await deps.refreshTokens.create({
      sessionId: session.id,
      tokenHash: hashRefreshToken(rawRefreshToken),
      expiresAt: computeRefreshTokenExpiry(issuedAt),
      rotatedFromId: null,
    });

    const accessToken = await deps.accessTokens.sign({
      userId: user.id,
      sessionId: session.id,
      deviceId: device.id,
    });

    await deps.loginAttempts.record({
      usernameAttempted: usernameNormalized,
      userId: user.id,
      ipAddress: input.ipAddress,
      succeeded: true,
      reason: null,
    });
    await deps.audit.record({
      type: "login",
      userId: user.id,
      ipAddress: input.ipAddress,
    });

    return {
      user: toPublicUser(user),
      sessionId: session.id,
      deviceId: device.id,
      deviceTrusted,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  };
}
