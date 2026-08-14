import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/config/roles";

/**
 * Edge-safe base auth configuration.
 *
 * This file MUST NOT import Node-only code (Prisma, bcrypt) because it is used
 * by `middleware.ts`, which runs on the Edge runtime. The Credentials provider —
 * whose `authorize` needs the database — lives in ./index.ts instead.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  // Self-hosted behind a known host (planner.trip-le.com / localhost in dev).
  // Required so Auth.js trusts the incoming Host header in production.
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [], // populated in ./index.ts (Node runtime)
  callbacks: {
    /** Route protection used by middleware. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isPublicAsset = nextUrl.pathname.startsWith("/api/auth");

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
