import "@/lib/env";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const SESSION_COOKIE = SESSION_COOKIE_NAME;

/**
 * Signing secret: prefer JWT_SECRET. If unset, derive a stable secret from the
 * DATABASE_URL so no predictable literal ever ships in the bundle.
 */
function signingSecret(): Uint8Array {
  const explicit = process.env.JWT_SECRET;
  if (explicit && explicit.length >= 16) {
    return new TextEncoder().encode(explicit);
  }
  const derived = `advrix|${process.env.DATABASE_URL || "local"}|session-signing`;
  return new TextEncoder().encode(derived);
}
const secret = signingSecret();

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role_key: string;
  role_label: string;
  dashboard: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySessionToken(token);
}