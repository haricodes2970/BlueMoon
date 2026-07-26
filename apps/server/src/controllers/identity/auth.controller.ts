import type { RouteHandler } from "@hono/zod-openapi";
import {
  DeviceNotFoundError,
  SessionExpiredError,
  UserNotFoundError,
} from "../../domain/identity/errors.js";
import { getClientIp } from "../../infrastructure/identity/client-ip.js";
import {
  clearRefreshTokenCookie,
  getRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../../infrastructure/identity/cookies.js";
import type { IdentityContainer } from "../../container.js";
import type {
  changeCredentialRoute,
  devicesRoute,
  loginRoute,
  logoutRoute,
  meRoute,
  refreshRoute,
  registerRoute,
  revokeDeviceTrustRoute,
  trustDeviceRoute,
} from "../../routes/identity/auth.routes.js";

export interface AuthControllerDeps {
  container: IdentityContainer;
  isProduction: boolean;
}

/**
 * One handler per endpoint, each typed against its route definition
 * (RouteHandler<typeof someRoute>) so `c.req.valid(...)` stays typed
 * even split out from the route registration. Controllers translate
 * between HTTP (cookies, headers, status codes) and the untouched
 * Milestone 0.6 application-layer use cases -- no business logic
 * lives here.
 */
export function createAuthControllers(deps: AuthControllerDeps) {
  const { container, isProduction } = deps;

  const register: RouteHandler<typeof registerRoute> = async (c) => {
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);

    const deviceLabel = body.deviceLabel ?? null;
    await container.registerUser({ ...body, deviceLabel, ipAddress });
    const result = await container.login({ ...body, deviceLabel, ipAddress });

    setRefreshTokenCookie(c, result.refreshToken, isProduction);
    return c.json(
      {
        success: true as const,
        data: {
          user: {
            ...result.user,
            createdAt: result.user.createdAt.toISOString(),
          },
          accessToken: result.accessToken,
          deviceTrusted: result.deviceTrusted,
        },
      },
      201,
    );
  };

  const login: RouteHandler<typeof loginRoute> = async (c) => {
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);

    const result = await container.login({
      ...body,
      deviceLabel: body.deviceLabel ?? null,
      ipAddress,
    });

    setRefreshTokenCookie(c, result.refreshToken, isProduction);
    return c.json(
      {
        success: true as const,
        data: {
          user: {
            ...result.user,
            createdAt: result.user.createdAt.toISOString(),
          },
          accessToken: result.accessToken,
          deviceTrusted: result.deviceTrusted,
        },
      },
      200,
    );
  };

  const logout: RouteHandler<typeof logoutRoute> = async (c) => {
    const auth = c.get("auth");
    const ipAddress = getClientIp(c);

    await container.logout({ sessionId: auth.sessionId, ipAddress });

    clearRefreshTokenCookie(c, isProduction);
    return c.json({ success: true as const, data: { ok: true as const } }, 200);
  };

  const refresh: RouteHandler<typeof refreshRoute> = async (c) => {
    const refreshToken = getRefreshTokenCookie(c);
    const ipAddress = getClientIp(c);

    if (!refreshToken) {
      throw new SessionExpiredError();
    }

    const result = await container.refreshSession({ refreshToken, ipAddress });

    setRefreshTokenCookie(c, result.refreshToken, isProduction);
    return c.json(
      { success: true as const, data: { accessToken: result.accessToken } },
      200,
    );
  };

  const changeCredential: RouteHandler<typeof changeCredentialRoute> = async (
    c,
  ) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);

    await container.changeCredential({
      userId: auth.userId,
      ...body,
      ipAddress,
    });

    // changeCredential revokes every session for the user, including
    // this request's own -- the client must log in again.
    clearRefreshTokenCookie(c, isProduction);
    return c.json({ success: true as const, data: { ok: true as const } }, 200);
  };

  const trustDevice: RouteHandler<typeof trustDeviceRoute> = async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const ipAddress = getClientIp(c);

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await container.trustDevice({
      userId: auth.userId,
      deviceId: body.deviceId,
      expiresAt,
      ipAddress,
    });

    return c.json(
      { success: true as const, data: { trustId: result.trustId } },
      201,
    );
  };

  const revokeDeviceTrust: RouteHandler<typeof revokeDeviceTrustRoute> = async (
    c,
  ) => {
    const auth = c.get("auth");
    const { id: trustId } = c.req.valid("param");
    const { deviceId } = c.req.valid("query");
    const ipAddress = getClientIp(c);

    // TrustedDeviceRepository.revoke(id) has no built-in ownership
    // check (see Milestone 0.7 notes) -- confirm the trust grant
    // actually belongs to this user+device before revoking it.
    const activeTrust =
      await container.trustedDevices.findActiveByUserAndDevice(
        auth.userId,
        deviceId,
      );
    if (!activeTrust || activeTrust.id !== trustId) {
      throw new DeviceNotFoundError();
    }

    await container.revokeDeviceTrust({
      trustId,
      userId: auth.userId,
      deviceId,
      ipAddress,
    });
    return c.json({ success: true as const, data: { ok: true as const } }, 200);
  };

  const me: RouteHandler<typeof meRoute> = async (c) => {
    const auth = c.get("auth");
    const user = await container.users.findById(auth.userId);
    if (!user) throw new UserNotFoundError();

    return c.json(
      {
        success: true as const,
        data: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt.toISOString(),
        },
      },
      200,
    );
  };

  const devices: RouteHandler<typeof devicesRoute> = async (c) => {
    const auth = c.get("auth");
    const userDevices = await container.devices.findAllByUserId(auth.userId);

    return c.json(
      {
        success: true as const,
        data: userDevices.map((device) => ({
          id: device.id,
          label: device.label,
          firstSeenAt: device.firstSeenAt.toISOString(),
          lastSeenAt: device.lastSeenAt.toISOString(),
        })),
      },
      200,
    );
  };

  return {
    register,
    login,
    logout,
    refresh,
    changeCredential,
    trustDevice,
    revokeDeviceTrust,
    me,
    devices,
  };
}
