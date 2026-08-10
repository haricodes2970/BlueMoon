export interface Message {
  id: string;
  conversationId: string;
  /** Null when the sender's account has been deleted (ON DELETE SET NULL). */
  senderId: string | null;
  content: string;
  createdAt: Date;
}
