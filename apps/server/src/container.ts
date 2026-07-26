import { createDatabase, type Database } from "@bluemoon/database";
import {
  createAccessTokenService,
  type AccessTokenService,
} from "./infrastructure/identity/access-token.js";
import { createAuditWriter } from "./infrastructure/identity/audit-writer.js";
import {
  hashCredential,
  verifyCredential,
} from "./infrastructure/identity/hashing.js";
import {
  createDeviceRepository,
  type DeviceRepository,
} from "./repositories/identity/device.repository.js";
import { createLoginAttemptRepository } from "./repositories/identity/login-attempt.repository.js";
import { createRefreshTokenRepository } from "./repositories/identity/refresh-token.repository.js";
import { createSessionRepository } from "./repositories/identity/session.repository.js";
import {
  createTrustedDeviceRepository,
  type TrustedDeviceRepository,
} from "./repositories/identity/trusted-device.repository.js";
import {
  createUserRepository,
  type UserRepository,
} from "./repositories/identity/user.repository.js";
import { createChangeCredentialUseCase } from "./services/identity/change-credential.service.js";
import { createLoginUseCase } from "./services/identity/login.service.js";
import { createLogoutUseCase } from "./services/identity/logout.service.js";
import { createRefreshSessionUseCase } from "./services/identity/refresh-session.service.js";
import { createRegisterUserUseCase } from "./services/identity/register-user.service.js";
import { createRevokeSessionUseCase } from "./services/identity/revoke-session.service.js";
import {
  createRevokeDeviceTrustUseCase,
  createTrustDeviceUseCase,
} from "./services/identity/trust-device.service.js";

/**
 * Composition root for the Identity bounded context -- wires
 * repositories and infrastructure into the application-layer use
 * cases exactly once, so routes/controllers never construct their
 * own dependencies. Every use case here is the same factory function
 * from Milestone 0.6, untouched; this file only wires them together.
 */
export interface IdentityContainer {
  users: UserRepository;
  devices: DeviceRepository;
  trustedDevices: TrustedDeviceRepository;
  accessTokens: AccessTokenService;
  registerUser: ReturnType<typeof createRegisterUserUseCase>;
  login: ReturnType<typeof createLoginUseCase>;
  logout: ReturnType<typeof createLogoutUseCase>;
  refreshSession: ReturnType<typeof createRefreshSessionUseCase>;
  revokeSession: ReturnType<typeof createRevokeSessionUseCase>;
  trustDevice: ReturnType<typeof createTrustDeviceUseCase>;
  revokeDeviceTrust: ReturnType<typeof createRevokeDeviceTrustUseCase>;
  changeCredential: ReturnType<typeof createChangeCredentialUseCase>;
}

export function createIdentityContainer(
  db: Database,
  accessTokenSecret: string,
): IdentityContainer {
  const users = createUserRepository(db);
  const devices = createDeviceRepository(db);
  const trustedDevices = createTrustedDeviceRepository(db);
  const sessions = createSessionRepository(db);
  const refreshTokens = createRefreshTokenRepository(db);
  const loginAttempts = createLoginAttemptRepository(db);
  const audit = createAuditWriter(db);
  const accessTokens = createAccessTokenService(accessTokenSecret);

  return {
    users,
    devices,
    trustedDevices,
    accessTokens,
    registerUser: createRegisterUserUseCase({
      users,
      devices,
      hashCredential,
      audit,
    }),
    login: createLoginUseCase({
      users,
      devices,
      trustedDevices,
      sessions,
      refreshTokens,
      loginAttempts,
      verifyCredential,
      accessTokens,
      audit,
    }),
    logout: createLogoutUseCase({ sessions, refreshTokens, audit }),
    refreshSession: createRefreshSessionUseCase({
      sessions,
      refreshTokens,
      accessTokens,
      audit,
    }),
    revokeSession: createRevokeSessionUseCase({
      sessions,
      refreshTokens,
      audit,
    }),
    trustDevice: createTrustDeviceUseCase({ devices, trustedDevices, audit }),
    revokeDeviceTrust: createRevokeDeviceTrustUseCase({
      trustedDevices,
      audit,
    }),
    changeCredential: createChangeCredentialUseCase({
      users,
      sessions,
      refreshTokens,
      hashCredential,
      verifyCredential,
      audit,
    }),
  };
}

export function createIdentityContainerFromDatabaseUrl(
  databaseUrl: string,
  accessTokenSecret: string,
): IdentityContainer {
  return createIdentityContainer(
    createDatabase(databaseUrl),
    accessTokenSecret,
  );
}
