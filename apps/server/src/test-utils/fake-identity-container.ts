import { randomUUID } from "node:crypto";
import {
  hashCredential,
  verifyCredential,
} from "../infrastructure/identity/hashing.js";
import { createAccessTokenService } from "../infrastructure/identity/access-token.js";
import { createRegisterUserUseCase } from "../services/identity/register-user.service.js";
import { createLoginUseCase } from "../services/identity/login.service.js";
import { createLogoutUseCase } from "../services/identity/logout.service.js";
import { createRefreshSessionUseCase } from "../services/identity/refresh-session.service.js";
import { createRevokeSessionUseCase } from "../services/identity/revoke-session.service.js";
import {
  createRevokeDeviceTrustUseCase,
  createTrustDeviceUseCase,
} from "../services/identity/trust-device.service.js";
import { createChangeCredentialUseCase } from "../services/identity/change-credential.service.js";
import type { IdentityContainer } from "../container.js";
import type {
  Device,
  TrustedDevice,
} from "../domain/identity/entities/device.js";
import type { LoginAttempt } from "../domain/identity/entities/login-attempt.js";
import type {
  RefreshToken,
  Session,
} from "../domain/identity/entities/session.js";
import type { User } from "../domain/identity/entities/user.js";
import type { IdentityAuditEvent } from "../events/identity-events.js";

/**
 * In-memory fake repositories implementing the exact same interfaces
 * as the real Drizzle-backed ones (Milestone 0.6) -- used because no
 * live PostgreSQL instance is available in this environment (see
 * TODO.md). Every application-layer/HTTP-layer test exercises the
 * real domain, infrastructure (real Argon2id/JWT), and service code;
 * only persistence is faked.
 */
export function createFakeIdentityContainer(accessTokenSecret: string): {
  container: IdentityContainer;
  auditEvents: IdentityAuditEvent[];
  loginAttempts: LoginAttempt[];
} {
  const users = new Map<string, User>();
  const devices = new Map<string, Device>();
  const trustedDevices = new Map<string, TrustedDevice>();
  const sessions = new Map<string, Session>();
  const refreshTokens = new Map<string, RefreshToken>();
  const loginAttempts: LoginAttempt[] = [];
  const auditEvents: IdentityAuditEvent[] = [];

  const usersRepo: IdentityContainer["users"] = {
    async findById(id) {
      return users.get(id) ?? null;
    },
    async findByUsername(username) {
      return [...users.values()].find((u) => u.username === username) ?? null;
    },
    async create(input) {
      const user: User = {
        id: randomUUID(),
        username: input.username,
        credentialHash: input.credentialHash,
        credentialUpdatedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      users.set(user.id, user);
      return user;
    },
    async updateCredential(userId, credentialHash) {
      const user = users.get(userId);
      if (user) user.credentialHash = credentialHash;
    },
    async recordFailedLogin(userId, failedLoginCount, lockedUntil) {
      const user = users.get(userId);
      if (user) {
        user.failedLoginCount = failedLoginCount;
        user.lockedUntil = lockedUntil;
      }
    },
    async resetFailedLogins(userId) {
      const user = users.get(userId);
      if (user) {
        user.failedLoginCount = 0;
        user.lockedUntil = null;
      }
    },
  };

  const devicesRepo: IdentityContainer["devices"] = {
    async findById(id) {
      return devices.get(id) ?? null;
    },
    async findByUserAndFingerprint(userId, fingerprint) {
      return (
        [...devices.values()].find(
          (d) => d.userId === userId && d.fingerprint === fingerprint,
        ) ?? null
      );
    },
    async findAllByUserId(userId) {
      return [...devices.values()].filter((d) => d.userId === userId);
    },
    async create(input) {
      const device: Device = {
        id: randomUUID(),
        userId: input.userId,
        fingerprint: input.fingerprint,
        label: input.label,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      devices.set(device.id, device);
      return device;
    },
    async touchLastSeen(deviceId) {
      const device = devices.get(deviceId);
      if (device) device.lastSeenAt = new Date();
    },
  };

  const trustedDevicesRepo: IdentityContainer["trustedDevices"] = {
    async findActiveByUserAndDevice(userId, deviceId) {
      return (
        [...trustedDevices.values()].find(
          (t) =>
            t.userId === userId &&
            t.deviceId === deviceId &&
            t.revokedAt === null,
        ) ?? null
      );
    },
    async create(input) {
      const trust: TrustedDevice = {
        id: randomUUID(),
        userId: input.userId,
        deviceId: input.deviceId,
        trustedAt: new Date(),
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      trustedDevices.set(trust.id, trust);
      return trust;
    },
    async revoke(id) {
      const trust = trustedDevices.get(id);
      if (trust) trust.revokedAt = new Date();
    },
  };

  const sessionsRepo = {
    async findById(id: string) {
      return sessions.get(id) ?? null;
    },
    async create(input: { userId: string; deviceId: string; expiresAt: Date }) {
      const session: Session = {
        id: randomUUID(),
        userId: input.userId,
        deviceId: input.deviceId,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: input.expiresAt,
        revokedAt: null,
      };
      sessions.set(session.id, session);
      return session;
    },
    async touchLastActive(id: string) {
      const session = sessions.get(id);
      if (session) session.lastActiveAt = new Date();
    },
    async revoke(id: string) {
      const session = sessions.get(id);
      if (session) session.revokedAt = new Date();
    },
    async revokeAllForUser(userId: string) {
      for (const session of sessions.values()) {
        if (session.userId === userId) session.revokedAt = new Date();
      }
    },
  };

  const refreshTokensRepo = {
    async findByHash(tokenHash: string) {
      return (
        [...refreshTokens.values()].find((t) => t.tokenHash === tokenHash) ??
        null
      );
    },
    async create(input: {
      sessionId: string;
      tokenHash: string;
      expiresAt: Date;
      rotatedFromId: string | null;
    }) {
      const token: RefreshToken = {
        id: randomUUID(),
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        createdAt: new Date(),
        expiresAt: input.expiresAt,
        revokedAt: null,
        rotatedFromId: input.rotatedFromId,
      };
      refreshTokens.set(token.id, token);
      return token;
    },
    async revoke(id: string) {
      const token = refreshTokens.get(id);
      if (token) token.revokedAt = new Date();
    },
    async revokeBySession(sessionId: string) {
      for (const token of refreshTokens.values()) {
        if (token.sessionId === sessionId) token.revokedAt = new Date();
      }
    },
    async revokeAllForUser() {
      for (const token of refreshTokens.values()) token.revokedAt = new Date();
    },
  };

  const loginAttemptsRepo = {
    async record(input: Omit<LoginAttempt, "id" | "createdAt">) {
      const attempt: LoginAttempt = {
        id: randomUUID(),
        createdAt: new Date(),
        ...input,
      };
      loginAttempts.push(attempt);
      return attempt;
    },
    async recentByUsername(usernameAttempted: string, since: Date) {
      return loginAttempts.filter(
        (a) =>
          a.usernameAttempted === usernameAttempted && a.createdAt >= since,
      );
    },
  };

  const audit = {
    async record(event: IdentityAuditEvent) {
      auditEvents.push(event);
    },
  };
  const accessTokens = createAccessTokenService(accessTokenSecret);

  const container: IdentityContainer = {
    users: usersRepo,
    devices: devicesRepo,
    trustedDevices: trustedDevicesRepo,
    accessTokens,
    registerUser: createRegisterUserUseCase({
      users: usersRepo,
      devices: devicesRepo,
      hashCredential,
      audit,
    }),
    login: createLoginUseCase({
      users: usersRepo,
      devices: devicesRepo,
      trustedDevices: trustedDevicesRepo,
      sessions: sessionsRepo,
      refreshTokens: refreshTokensRepo,
      loginAttempts: loginAttemptsRepo,
      verifyCredential,
      accessTokens,
      audit,
    }),
    logout: createLogoutUseCase({
      sessions: sessionsRepo,
      refreshTokens: refreshTokensRepo,
      audit,
    }),
    refreshSession: createRefreshSessionUseCase({
      sessions: sessionsRepo,
      refreshTokens: refreshTokensRepo,
      accessTokens,
      audit,
    }),
    revokeSession: createRevokeSessionUseCase({
      sessions: sessionsRepo,
      refreshTokens: refreshTokensRepo,
      audit,
    }),
    trustDevice: createTrustDeviceUseCase({
      devices: devicesRepo,
      trustedDevices: trustedDevicesRepo,
      audit,
    }),
    revokeDeviceTrust: createRevokeDeviceTrustUseCase({
      trustedDevices: trustedDevicesRepo,
      audit,
    }),
    changeCredential: createChangeCredentialUseCase({
      users: usersRepo,
      sessions: sessionsRepo,
      refreshTokens: refreshTokensRepo,
      hashCredential,
      verifyCredential,
      audit,
    }),
  };

  return { container, auditEvents, loginAttempts };
}
