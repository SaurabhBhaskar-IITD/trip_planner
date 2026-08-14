import "server-only";
import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";

/**
 * Prisma client singleton.
 *
 * Next.js re-imports modules on every hot reload in development; without caching
 * we'd exhaust the Postgres connection pool with a new PrismaClient per reload.
 * We stash one instance on `globalThis` and reuse it.
 *
 * `import "server-only"` makes the build FAIL if this module is ever imported
 * into a client component — Prisma and the database URL must never reach the
 * browser bundle.
 *
 * Instantiating PrismaClient does NOT connect; the first query does. So importing
 * this module is safe even when DATABASE_URL is unset — data code paths guard on
 * `isDatabaseConfigured()` and surface an honest "not connected" state.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["error", "warn"],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

/** True when a database connection string is configured. */
export function isDatabaseConfigured(): boolean {
  return env.isDatabaseConfigured;
}
