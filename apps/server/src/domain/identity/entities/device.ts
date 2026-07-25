export interface Device {
  id: string;
  userId: string;
  fingerprint: string;
  label: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrustedDevice {
  id: string;
  userId: string;
  deviceId: string;
  trustedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isTrustActive(
  trust: Pick<TrustedDevice, "revokedAt" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (trust.revokedAt !== null) return false;
  if (trust.expiresAt !== null && trust.expiresAt.getTime() <= now.getTime())
    return false;
  return true;
}
