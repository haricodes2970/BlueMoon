import { z } from "zod";

export const trustDeviceRequestSchema = z.object({
  deviceId: z.string().uuid(),
  /** Omit for a trust grant that never expires. */
  expiresInDays: z.number().int().positive().max(365).nullable().optional(),
});

export type TrustDeviceRequest = z.infer<typeof trustDeviceRequestSchema>;

export const revokeDeviceTrustRequestSchema = z.object({
  trustId: z.string().uuid(),
  deviceId: z.string().uuid(),
});

export type RevokeDeviceTrustRequest = z.infer<
  typeof revokeDeviceTrustRequestSchema
>;
