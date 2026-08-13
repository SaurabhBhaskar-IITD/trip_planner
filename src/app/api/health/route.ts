import { NextResponse } from "next/server";
import { env } from "@/config/env";

/**
 * Liveness/readiness probe. Reports only non-sensitive status — never secrets or
 * connection strings. Used by uptime checks and deploy smoke tests.
 */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "trip-le-planner",
    databaseConfigured: env.isDatabaseConfigured,
    time: new Date().toISOString(),
  });
}
