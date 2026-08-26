export const SESSION_COOKIE_NAME = "advrix_session";

let warnedInProduction = false;

/**
 * Shared JWT signing secret used by both middleware (Edge) and server actions.
 * Uses JWT_SECRET env var when available. Falls back to DATABASE_URL-derived key.
 * Logs a warning in production if JWT_SECRET is not set (instead of crashing).
 */
export function getSigningSecret(): Uint8Array {
  const explicit = process.env.JWT_SECRET;
  if (explicit && explicit.length >= 16) {
    return new TextEncoder().encode(explicit);
  }
  if (process.env.NODE_ENV === "production" && !warnedInProduction) {
    warnedInProduction = true;
    console.warn(
      "[ADVRIX] WARNING: JWT_SECRET is not set. Using derived fallback. " +
      "Set JWT_SECRET in Vercel env vars for proper security. " +
      "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const derived = `advrix|${process.env.DATABASE_URL || "local"}|session-signing`;
  return new TextEncoder().encode(derived);
}