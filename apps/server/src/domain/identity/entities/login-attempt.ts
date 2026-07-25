export interface LoginAttempt {
  id: string;
  usernameAttempted: string;
  userId: string | null;
  ipAddress: string;
  succeeded: boolean;
  reason: string | null;
  createdAt: Date;
}
