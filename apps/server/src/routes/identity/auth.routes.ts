import { createRoute, z } from "@hono/zod-openapi";
import { changeCredentialRequestSchema } from "../../validation/identity/change-credential.schema.js";
import { loginRequestSchema } from "../../validation/identity/login.schema.js";
import { registerRequestSchema } from "../../validation/identity/register.schema.js";
import { trustDeviceRequestSchema } from "../../validation/identity/trust-device.schema.js";

/**
 * Response schemas -- separate from the request validation schemas
 * (validation/identity/*.schema.ts), which describe use-case input,
 * not HTTP output shape. Every success response is wrapped in the
 * existing ApiResponse<T> envelope ({ success: true, data }); errors
 * are shaped by middleware/error-handler.ts, unchanged.
 */
const publicUserSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  createdAt: z.string(),
});

const authResultSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: publicUserSchema,
    accessToken: z.string(),
    deviceTrusted: z.boolean(),
  }),
});

const okSchema = z.object({
  success: z.literal(true),
  data: z.object({ ok: z.literal(true) }),
});

const refreshResultSchema = z.object({
  success: z.literal(true),
  data: z.object({ accessToken: z.string() }),
});

const meResultSchema = z.object({
  success: z.literal(true),
  data: publicUserSchema,
});

const trustDeviceResultSchema = z.object({
  success: z.literal(true),
  data: z.object({ trustId: z.string().uuid() }),
});

const deviceSummarySchema = z.object({
  id: z.string().uuid(),
  label: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
});

const devicesResultSchema = z.object({
  success: z.literal(true),
  data: z.array(deviceSummarySchema),
});

export const registerRoute = createRoute({
  method: "post",
  path: "/auth/register",
  request: {
    body: {
      content: { "application/json": { schema: registerRequestSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: authResultSchema } },
      description: "Account created and logged in",
    },
  },
});

export const loginRoute = createRoute({
  method: "post",
  path: "/auth/login",
  request: {
    body: { content: { "application/json": { schema: loginRequestSchema } } },
  },
  responses: {
    200: {
      content: { "application/json": { schema: authResultSchema } },
      description: "Logged in",
    },
  },
});

export const logoutRoute = createRoute({
  method: "post",
  path: "/auth/logout",
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Logged out",
    },
  },
});

export const refreshRoute = createRoute({
  method: "post",
  path: "/auth/refresh",
  responses: {
    200: {
      content: { "application/json": { schema: refreshResultSchema } },
      description: "New access token issued",
    },
  },
});

export const changeCredentialRoute = createRoute({
  method: "post",
  path: "/auth/change-credential",
  request: {
    body: {
      content: {
        "application/json": { schema: changeCredentialRequestSchema },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description:
        "Credential changed; every session (including this one) was revoked",
    },
  },
});

export const trustDeviceRoute = createRoute({
  method: "post",
  path: "/auth/trust-device",
  request: {
    body: {
      content: { "application/json": { schema: trustDeviceRequestSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: trustDeviceResultSchema } },
      description: "Device trusted",
    },
  },
});

export const revokeDeviceTrustParamsSchema = z.object({
  id: z.string().uuid().openapi({ description: "Trust grant ID" }),
});
export const revokeDeviceTrustQuerySchema = z.object({
  deviceId: z
    .string()
    .uuid()
    .openapi({ description: "Device the trust grant belongs to" }),
});

export const revokeDeviceTrustRoute = createRoute({
  method: "delete",
  path: "/auth/trust-device/{id}",
  request: {
    params: revokeDeviceTrustParamsSchema,
    query: revokeDeviceTrustQuerySchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: okSchema } },
      description: "Device trust revoked",
    },
  },
});

export const meRoute = createRoute({
  method: "get",
  path: "/auth/me",
  responses: {
    200: {
      content: { "application/json": { schema: meResultSchema } },
      description: "Current authenticated user",
    },
  },
});

export const devicesRoute = createRoute({
  method: "get",
  path: "/auth/devices",
  responses: {
    200: {
      content: { "application/json": { schema: devicesResultSchema } },
      description: "Every device recorded for the current user",
    },
  },
});
