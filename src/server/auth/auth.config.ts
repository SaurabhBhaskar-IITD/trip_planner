import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/config/roles";

/**
 * Edge-safe base auth configuration.
 *
 * This file MUST NOT import Node-only code (Prisma, bcrypt) because it is used
 * by `middleware.ts`, which runs on the Edge runtime. The Credentials provider —
 * whose `authorize` needs the database — lives in ./index.ts instead.
 */
/**
 * APP-SPECIFIC COOKIE NAMES.
 *
 * Auth.js defaults to `authjs.session-token`, and trip-le.com runs Auth.js too.
 * Cookies are scoped by HOST, not by port, so in development both apps sit on
 * `localhost` and overwrite each other's session cookie — the planner then tries
 * to decrypt the website's token with its own AUTH_SECRET and fails with
 * "no matching decryption secret" (JWTSessionError), silently signing you out.
 *
 * Naming the planner's cookies distinctly makes the two sessions coexist.
 * NOTE: renaming invalidates existing planner sessions once — everyone signs in
 * again after this ships. The `__Secure-`/`__Host-` prefixes are kept in
 * production, where the browser enforces their extra guarantees.
 */
const PREFIX = "trip-le-planner";
const secureCookies = process.env.NODE_ENV === "production";
const secured = (name: string, prefix: "__Secure-" | "__Host-") =>
  `${secureCookies ? prefix : ""}${name}`;

const cookies = {
  sessionToken: {
    name: secured(`${PREFIX}.session-token`, "__Secure-"),
    options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
  },
  callbackUrl: {
    name: secured(`${PREFIX}.callback-url`, "__Secure-"),
    options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
  },
  csrfToken: {
    // `__Host-` additionally requires secure + path "/" + no domain, all true here.
    name: secured(`${PREFIX}.csrf-token`, "__Host-"),
    options: { httpOnly: true, sameSite: "lax", path: "/", secure: secureCookies },
  },
} as const;

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Self-hosted behind a known host (planner.trip-le.com / localhost in dev).
  // Required so Auth.js trusts the incoming Host header in production.
  trustHost: true,
  cookies,
  logger: {
    /**
     * An unreadable session cookie is an EXPECTED, self-healing condition: a
     * rotated AUTH_SECRET, or a leftover cookie from another Auth.js app on the
     * same host. The user is simply redirected to sign in again, so log one
     * clear line instead of a stack trace that looks like a crash.
     */
    error(error: Error) {
      if (error?.name === "JWTSessionError") {
        console.warn("[auth] Ignoring an unreadable session cookie — sign in again to refresh it.");
        return;
      }
      console.error(error);
    },
  },
  session: { strategy: "jwt" },
  providers: [], // populated in ./index.ts (Node runtime)
  callbacks: {
    /** Route protection used by middleware. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      // Routes that must be reachable without a planner session. Each one
      // enforces its own access rule:
      //   /api/public/*   — customer-safe, read-only data for trip-le.com
      //   /api/internal/* — service-to-service, shared-secret bearer
      //   /api/health     — non-sensitive liveness probe
      const path = nextUrl.pathname;
      const isPublicAsset =
        path.startsWith("/api/auth") ||
        path.startsWith("/api/public/") ||
        path.startsWith("/api/internal/") ||
        path === "/api/health";

      if (isPublicAsset) return true;
      if (isOnLogin) {
        // Already signed in? bounce to dashboard.
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
