import { z } from "zod";

/**
 * Input-shape validation only (types, presence, lengths as a first
 * pass). The authoritative rules (reserved names, trivial credentials,
 * etc.) live in the domain value objects (Username, Credential) and
 * run again in the use case -- this schema exists to reject garbage
 * requests cheaply, at the API boundary, before domain logic runs.
 */
export const registerRequestSchema = z.object({
  username: z.string().min(1).max(64),
  credential: z.string().min(1).max(16),
  deviceFingerprint: z.string().min(1).max(256),
  deviceLabel: z.string().max(128).nullable().optional(),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
