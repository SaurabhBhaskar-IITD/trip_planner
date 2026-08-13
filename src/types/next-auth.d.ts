import type { Role } from "@/config/roles";
import type { DefaultSession } from "next-auth";

/**
 * Augment NextAuth types so `session.user.role` / `.id` are strongly typed
 * everywhere they are consumed.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
