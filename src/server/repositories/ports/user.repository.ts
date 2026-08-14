import type { Role } from "@/config/roles";
import type { EntityId } from "@/domain/entities";

/**
 * Auth-facing user record. Includes the password hash, so it must NEVER be
 * returned to a client — only the auth `authorize` flow consumes it.
 */
export interface AuthUserRecord {
  id: EntityId;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  active: boolean;
}

/**
 * Port (interface) for user persistence. The application/auth layer depends on
 * THIS, not on Prisma. The Prisma implementation lives in ../prisma.
 */
export interface UserRepository {
  /** Find an active user by email, including the password hash for verification. */
  findActiveByEmail(email: string): Promise<AuthUserRecord | null>;
  /** Best-effort update of the last-login timestamp. */
  touchLastLogin(id: EntityId): Promise<void>;
}
