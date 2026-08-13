import { z } from "zod";

/**
 * Centralised, validated environment configuration.
 *
 * This is the ONLY place env vars should be read. Importing this module fails
 * fast (at boot) with a readable error if required configuration is missing or
 * malformed, so we never ship a half-configured server.
 *
 * Design notes:
 * - MONGODB_URI is optional so the app can boot and render the UI shell without
 *   a database (Phase 1 requirement). Data-backed code paths must guard against
 *   `env.MONGODB_URI` being undefined and surface an honest "unconfigured" state
 *   rather than crashing.
 * - Only variables prefixed `NEXT_PUBLIC_` are safe to reference from client
 *   components. Everything else is server-only and must never be imported into
 *   client code.
 */

const serverSchema = z.object({
  MONGODB_URI: z.string().url().optional(),
  MONGODB_DB_NAME: z.string().min(1).default("trip_le_planner"),
  AUTH_SECRET: z
    .string()
    .min(1, "AUTH_SECRET is required to sign session tokens")
    // In development we allow a fallback so the app boots for UI work; in
    // production a real secret is mandatory (enforced below).
    .optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

const parsedServer = serverSchema.safeParse(process.env);
if (!parsedServer.success) {
  throw new Error(`Invalid server environment configuration:\n${formatIssues(parsedServer.error)}`);
}

const parsedClient = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
if (!parsedClient.success) {
  throw new Error(`Invalid client environment configuration:\n${formatIssues(parsedClient.error)}`);
}

const isProduction = parsedServer.data.NODE_ENV === "production";

// `next build` runs with NODE_ENV=production but has no runtime secrets; skip the
// hard requirement during the build phase and enforce it at production RUNTIME.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (isProduction && !isBuildPhase && !parsedServer.data.AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be set in production.");
}

export const env = {
  ...parsedServer.data,
  ...parsedClient.data,
  /** Convenience flag used across the app. */
  isProduction,
  /** True when a database connection string is configured. */
  isDatabaseConfigured: Boolean(parsedServer.data.MONGODB_URI),
} as const;

export type Env = typeof env;
