/**
 * BlueMoon Token lifetime -- see docs/product/Product-Requirements-Document.md#bluemoon-token.
 * Deliberately short: this is a one-time intentional-connection
 * capability shared out of band, not a long-lived credential.
 */
export const BLUE_MOON_TOKEN_TTL_MS = 300 * 1000; // 300 seconds

export function computeBlueMoonTokenExpiry(issuedAt: Date = new Date()): Date {
  return new Date(issuedAt.getTime() + BLUE_MOON_TOKEN_TTL_MS);
}
