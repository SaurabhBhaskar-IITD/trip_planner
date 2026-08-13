import { redirect } from "next/navigation";
import type { Permission } from "@/config/roles";
import { can, getCurrentUser, type SessionUser } from "./rbac";

export type PageGuardResult =
  { allowed: true; user: SessionUser } | { allowed: false; user: SessionUser };

/**
 * Server-side page access guard.
 *
 * Redirects unauthenticated users to /login. For authenticated-but-unauthorised
 * users it returns `{ allowed: false }` so the page can render an in-shell
 * AccessDenied view (better UX than a hard error). This is enforcement, not UI
 * hiding — the caller must respect the result.
 */
export async function guardPage(permission: Permission): Promise<PageGuardResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return { allowed: can(user, permission), user };
}
