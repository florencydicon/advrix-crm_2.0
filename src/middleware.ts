import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME, getSigningSecret } from "@/lib/constants";

const secret = getSigningSecret();

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp|css|js)$).*)"],
};