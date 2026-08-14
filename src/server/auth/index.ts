import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { userRepository } from "@/server/repositories";

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

        // If the DB isn't configured/reachable, authentication fails (no crash).
        let user;
        try {
          user = await userRepository.findActiveByEmail(email);
        } catch {
          return null;
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
