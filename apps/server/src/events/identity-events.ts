export const IDENTITY_EVENT_TYPES = [
  "registration",
  "login",
  "login_failed",
  "logout",
  "credential_changed",
  "device_trusted",
  "device_trust_revoked",
  "session_revoked",
] as const;

export type IdentityEventType = (typeof IDENTITY_EVENT_TYPES)[number];

export interface IdentityAuditEvent {
  type: IdentityEventType;
  userId: string | null;
  ipAddress: string | null;
  metadata?: Record<string, unknown>;
}
