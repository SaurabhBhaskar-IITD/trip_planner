import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { userRepository } from "@/server/repositories";
import { DatabaseError } from "@/lib/errors/app-error";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Full auth setup (Node runtime). The Credentials provider validates against
 * PostgreSQL via the UserRepository — it never touches Prisma directly, keeping
 * the ORM isolated in the infrastructure layer. Exported `auth`, `signIn`,
 * `signOut` and `handlers` are used across server components, actions and the
 * API route.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // A database failure is NOT a credential failure. Returning null here
        // would tell the user "invalid email or password" when the real problem
        // is infrastructure — so we log it and rethrow, letting the action layer
        // report an honest "temporarily unavailable" instead.
        //
        // Neon auto-suspends when idle and its cold start can exceed the connect
        // timeout, so one retry turns the common transient case into a success.
        let user;
        try {
          user = await userRepository.findActiveByEmail(email);
        } catch (first) {
          console.warn("[auth] user lookup failed, retrying once:", first);
          try {
            user = await userRepository.findActiveByEmail(email);
          } catch (second) {
            console.error("[auth] user lookup failed after retry:", second);
            throw new DatabaseError("Could not reach the user database.", second);
          }
        }
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // Best-effort login timestamp; never block sign-in on it.
        void userRepository.touchLastLogin(user.id).catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
