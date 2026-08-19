import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const LEGACY_PATH = "/admin";
const LOGIN_PATH = "/painel/login";
const PUBLIC_PANEL_PATHS = new Set([
  LOGIN_PATH,
  "/painel/esqueci-senha",
  "/painel/redefinir-senha",
]);
const SESSION_COOKIE = "m7_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LEGACY_PATH || pathname.startsWith(`${LEGACY_PATH}/`)) {
    const destination = request.nextUrl.clone();
    destination.pathname = `/painel${pathname.slice(LEGACY_PATH.length)}`;
    return NextResponse.redirect(destination, 308);
  }

  if (PUBLIC_PANEL_PATHS.has(pathname)) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/painel/:path*"],
};
