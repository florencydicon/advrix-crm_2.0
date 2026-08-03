import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

// Role pramane valid routes define karya che
const roleRoutes: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  PROJECT_MANAGER: "/pm",
  SALES_REP: "/sales",
  CONTENT_WRITER: "/writer",
  GRAPHIC_DESIGNER: "/designer",
  VIDEO_EDITOR: "/editor",
  SOCIAL_MEDIA_MANAGER: "/smm",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Login page par koi check nathi karvanu
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  // Token check karo
  const sessionToken = request.cookies.get("advrix_session")?.value;
  
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const session = await decrypt(sessionToken);
  
  // Jo token valid na hoy to login par mokli do
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role Validation Logic
  const userRole = session.role as string;
  const allowedBasePath = roleRoutes[userRole];

  // Jo user potana route sivay bija koi na route ma java try kare, to e potana dashboard par pacho fankai jase
  if (allowedBasePath && !pathname.startsWith(allowedBasePath)) {
    return NextResponse.redirect(new URL(`${allowedBasePath}/dashboard`, request.url));
  }

  return NextResponse.next();
}

// Middleware kaya routes par chalse e define karyu
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, window.svg (public files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg).*)",
  ],
};