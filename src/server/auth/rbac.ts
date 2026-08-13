import { auth } from "./index";
import { roleHasPermission, type Permission, type Role } from "@/config/roles";
import { ForbiddenError, UnauthenticatedError } from "@/lib/errors/app-error";

/**
 * Server-side authorization — the single source of truth.
 *
 * UI may hide controls, but ACCESS is decided here. Every server action and route
 * handler that mutates or reads protected data must call `requirePermission` (or
 * `requireUser`) before doing work. Never trust a hidden button as security.
 */

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
}

/** Returns the signed-in user or null. Safe to use in server components. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/** Throws UnauthenticatedError if there is no session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/** Pure check — does this user hold the permission? */
export function can(user: Pick<SessionUser, "role">, permission: Permission): boolean {
  return roleHasPermission(user.role, permission);
}

/** Throws if not signed in (401) or lacking the permission (403). */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return user;
}
