import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const secretKey = process.env.JWT_SECRET || "default_secret";
const key = new TextEncoder().encode(secretKey);

// JWT banavva mate (Login thaya pachi)
export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // 24 kalak pachi expire
    .sign(key);
}

// JWT check karva mate (Middleware ma)
export async function decrypt(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null;
  }
}

// User nu session cookie get karva
export async function getSession() {
  const cookieStore = await cookies(); // 👈 Ahiya 'await' lagavvanu che
  const sessionToken = cookieStore.get("advrix_session")?.value;
  
  if (!sessionToken) return null;
  return await decrypt(sessionToken);
}