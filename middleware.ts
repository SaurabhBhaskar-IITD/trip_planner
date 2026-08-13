import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/auth.config";

/**
 * Edge middleware guards every route via the `authorized` callback in authConfig.
 * It uses the edge-safe config only (no DB/bcrypt). This is the FIRST line of
 * defence; server actions/handlers still re-check permissions independently.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
