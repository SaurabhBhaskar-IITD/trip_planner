import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/server/auth/auth.config";

/**
 * Edge middleware guards every route via the `authorized` callback in authConfig.
 * It uses the edge-safe config only (no DB/bcrypt). This is the FIRST line of
 * defence; server actions/handlers still re-check permissions independently.
 *
 * If AUTH_SECRET is not configured in the environment, NextAuth throws
 * MissingSecretError on every request — crashing the entire app. We catch that
 * and redirect to /login with a clear query-param error so the user (and the
 * admin) can see what's wrong instead of a raw 500.
 */

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

let authMiddleware: ReturnType<typeof NextAuth>["auth"] | null = null;
if (secret) {
  authMiddleware = NextAuth(authConfig).auth;
}

export async function middleware(request: NextRequest) {
  if (!authMiddleware) {
    const isHealthCheck = request.nextUrl.pathname === "/api/health";
    if (isHealthCheck) return NextResponse.next();

    const isLoginPage = request.nextUrl.pathname.startsWith("/login");
    if (isLoginPage) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  return (authMiddleware as unknown as (req: NextRequest) => Promise<NextResponse>)(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
