export interface BlueMoonToken {
  id: string;
  ownerId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  consumedByUserId: string | null;
  createdAt: Date;
}

export function isBlueMoonTokenActive(
  token: Pick<BlueMoonToken, "consumedAt" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (token.consumedAt !== null) return false;
  return token.expiresAt.getTime() > now.getTime();
}
