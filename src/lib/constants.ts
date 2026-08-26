export const SESSION_COOKIE_NAME = "advrix_session";

/**
 * Shared JWT signing secret used by both middleware (Edge) and server actions.
 * In production, JWT_SECRET must be set (≥32 chars). In development, falls
 * back to a derived key from DATABASE_URL.
 */
export function getSigningSecret(): Uint8Array {
  const explicit = process.env.JWT_SECRET;
  if (explicit && explicit.length >= 16) {
    return new TextEncoder().encode(explicit);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set in production (minimum 32 characters). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const derived = `advrix|${process.env.DATABASE_URL || "local"}|session-signing`;
  return new TextEncoder().encode(derived);
}