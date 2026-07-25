export interface User {
  id: string;
  username: string;
  credentialHash: string;
  credentialUpdatedAt: Date;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isLocked(
  user: Pick<User, "lockedUntil">,
  now: Date = new Date(),
): boolean {
  return (
    user.lockedUntil !== null && user.lockedUntil.getTime() > now.getTime()
  );
}
