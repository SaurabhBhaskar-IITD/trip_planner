"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/server/auth";
import { loginSchema } from "@/lib/validation/auth.schema";
import { actionFail, actionOk, type ActionResult } from "./action-result";
import { ValidationError } from "@/lib/errors/app-error";

/**
 * A Next.js redirect is thrown as a special error carrying a NEXT_REDIRECT
 * digest. We detect it structurally (no fragile private-module import) so we can
 * rethrow and let the redirect proceed.
 */
function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/**
 * Credentials login. On success NextAuth throws a redirect (to /dashboard) which
 * we must let propagate. Genuine auth failures return a typed, friendly result.
 */
export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionFail(
      new ValidationError("Please fix the highlighted fields.", parsed.error.flatten().fieldErrors),
    );
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
    return actionOk(undefined);
  } catch (error) {
    // Next's redirect is thrown as an error by design — rethrow to let it happen.
    if (isNextRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Invalid email or password.",
      };
    }
    return actionFail(error);
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
