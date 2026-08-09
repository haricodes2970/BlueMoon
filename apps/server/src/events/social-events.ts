export const SOCIAL_EVENT_TYPES = [
  "blue_moon_token_generated",
  "blue_moon_token_consume_failed",
  "friendship_created",
  "friendship_removed",
] as const;

export type SocialEventType = (typeof SOCIAL_EVENT_TYPES)[number];

export interface SocialAuditEvent {
  type: SocialEventType;
  userId: string | null;
  ipAddress: string | null;
  metadata?: Record<string, unknown>;
}
