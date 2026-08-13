import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { Role } from "@/config/roles";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { connectToDatabase } from "@/server/db/connection";
import { UserModel } from "@/server/db/models";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Full auth setup (Node runtime). Adds the Credentials provider whose authorize
 * callback validates against MongoDB. Exported `auth`, `signIn`, `signOut` and
 * `handlers` are used across server components, actions and the API route.
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

        // If the DB isn't configured, authentication simply fails (no crash).
        try {
          await connectToDatabase();
        } catch {
          return null;
        }

        const user = await UserModel.findOne({ email, active: true })
          .select("+passwordHash")
          .lean<{ _id: unknown; name: string; email: string; role: Role; passwordHash: string }>();

        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // Best-effort login timestamp; never block sign-in on it.
        void UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() }).catch(() => {});

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
