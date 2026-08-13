import bcrypt from "bcryptjs";

/**
 * Password hashing. bcrypt with a work factor of 12 — a sensible balance of
 * security and latency for an internal tool. Plaintext passwords never leave
 * this module and are never logged or persisted.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
