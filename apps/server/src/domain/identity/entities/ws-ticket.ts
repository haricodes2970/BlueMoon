export interface WsTicket {
  id: string;
  sessionId: string;
  userId: string;
  deviceId: string;
  ticketHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}
