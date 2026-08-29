import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, getSigningSecret } from "@/lib/constants";

const secret = getSigningSecret();

/**
 * Edge-compatible IP rate limiter. Tracks requests per IP with sliding window.
 * In-memory — resets on cold start, but sufficient for abuse prevention at
 * the edge layer. Server-side throttle (DB-backed) handles persistent attacks.
 */
const rateMap = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_MAX = 120; // requests per window per IP

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateMap.get(ip);
  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  rec.count += 1;
  if (rec.count > RATE_MAX) return false;
  return true;
}

// Periodic cleanup of stale entries (every ~5 min via lazy check)
let lastCleanup = 0;
function cleanupRateMap() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [ip, rec] of rateMap) {
    if (now - rec.windowStart > RATE_WINDOW_MS * 2) rateMap.delete(ip);
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Rate limit all requests
  const ip = getClientIp(req);
  cleanupRateMap();
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const isPublic = pathname === "/" || pathname === "/login";

  if (isPublic) {
    if (token) {
      try {
        await jwtVerify(token, secret);
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      } catch {
        // Invalid token — clear cookie, continue to public page
        const res = NextResponse.next();
        res.cookies.delete(SESSION_COOKIE_NAME);
        if (pathname === "/") {
          const url = req.nextUrl.clone();
          url.pathname = "/login";
          url.search = "";
          return NextResponse.redirect(url);
        }
        return res;
      }
    }
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Verify JWT — forged/expired cookies get bounced to login
  try {
    await jwtVerify(token, secret);
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest\\.json|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js|json|webmanifest|xml)$).*)"],
};