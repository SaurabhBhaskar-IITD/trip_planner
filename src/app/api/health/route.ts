import { NextResponse } from "next/server";
import { env } from "@/config/env";

// A liveness probe must reflect the live environment, not a build-time snapshot —
// force dynamic so it is evaluated per-request and never during page-data
// collection at build.
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe. Reports only non-sensitive status — never secrets or
 * connection strings. Used by uptime checks and deploy smoke tests.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "trip-le-planner",
    databaseConfigured: env.isDatabaseConfigured,
    authConfigured: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    time: new Date().toISOString(),
  });
}
