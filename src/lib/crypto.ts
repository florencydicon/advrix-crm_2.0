import crypto from "node:crypto";
import "@/lib/env";

const SALT = "advrix|password-viewer";

/**
 * Reversible-secret key: derived from JWT_SECRET (or DATABASE_URL fallback),
 * salted separately from the session-signing secret so the two never match.
 */
function viewerKey(): Buffer {
  const material =
    process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16
      ? process.env.JWT_SECRET
      : process.env.DATABASE_URL || "local";
  return crypto.createHash("sha256").update(`${SALT}|${material}`).digest();
}

/** AES-256-GCM -> "iv:tag:ciphertext" (base64 segments). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", viewerKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      viewerKey(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
