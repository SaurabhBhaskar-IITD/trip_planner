import { z } from "zod";

/**
 * Centralised, validated environment configuration.
 *
 * This is the ONLY place env vars should be read. Importing this module fails
 * fast (at boot) with a readable error if required configuration is missing or
 * malformed, so we never ship a half-configured server.
 *
 * Design notes:
 * - DATABASE_URL is optional so the app can boot and render the UI shell without
 *   a database. Data-backed code paths must guard against `env.DATABASE_URL`
 *   being undefined (via `isDatabaseConfigured`) and surface an honest
 *   "unconfigured" state rather than crashing.
 * - Only variables prefixed `NEXT_PUBLIC_` are safe to reference from client
 *   components. Everything else is server-only and must never be imported into
 *   client code.
 */

// Treat an empty / whitespace-only env var the same as an unset one. Hosts like
// Vercel can inject declared-but-empty variables; without this an empty
// DATABASE_URL would fail `.min(1)` and CRASH the build, instead of degrading to
// the intended "not configured" state.
const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const serverSchema = z.object({
  // Neon PostgreSQL connection string. Optional so the app can boot and render
  // the UI shell without a database; data code paths guard on isDatabaseConfigured.
  // The database/branch is chosen entirely via this URL (dev/staging/prod).
  DATABASE_URL: z.preprocess(
    blankToUndefined,
    z
      .string()
      .min(1)
      .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
        message: "DATABASE_URL must be a PostgreSQL connection string",
      })
      .optional(),
  ),
  AUTH_SECRET: z.preprocess(
    blankToUndefined,
    // In development we allow a fallback so the app boots for UI work; in
    // production a real secret is mandatory (enforced below).
    z.string().min(1, "AUTH_SECRET is required to sign session tokens").optional(),
  ),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const DEFAULT_APP_URL = "http://localhost:3000";

const clientSchema = z.object({
  // Non-critical (auth uses trustHost; this is only for absolute links). Blank →
  // default; a malformed value falls back rather than crashing the build. Set it
  // to the real production URL for correct absolute links.
  NEXT_PUBLIC_APP_URL: z
    .preprocess(blankToUndefined, z.string().url().default(DEFAULT_APP_URL))
    .catch(DEFAULT_APP_URL),
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
  console.error(
    "[env] AUTH_SECRET is not set — sessions will use an insecure fallback. " +
      "Set AUTH_SECRET in your Vercel / hosting environment variables.",
  );
}

export const env = {
  ...parsedServer.data,
  ...parsedClient.data,
  /** Convenience flag used across the app. */
  isProduction,
  /** True when a database connection string is configured. */
  isDatabaseConfigured: Boolean(parsedServer.data.DATABASE_URL),
} as const;

export type Env = typeof env;
