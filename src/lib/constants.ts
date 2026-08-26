export const SESSION_COOKIE_NAME = "advrix_session";

/**
 * Shared JWT signing secret used by both middleware (Edge) and server actions.
 * Prefer JWT_SECRET env var; fall back to a derived key from DATABASE_URL.
 */
export function getSigningSecret(): Uint8Array {
  const explicit = process.env.JWT_SECRET;
  if (explicit && explicit.length >= 16) {
    return new TextEncoder().encode(explicit);
  }
  const derived = `advrix|${process.env.DATABASE_URL || "local"}|session-signing`;
  return new TextEncoder().encode(derived);
}