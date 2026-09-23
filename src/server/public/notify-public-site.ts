import "server-only";
import { env } from "@/config/env";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, signBody } from "@/server/security/shared-secret";

/**
 * Tell trip-le.com that a trip's public data changed, so it revalidates ONLY that
 * trip's cached options (targeted, never a global cache flush).
 *
 *   planner mutation → DB commit → notifyPublicSite(slug) → website revalidateTag
 *
 * Deliberately best-effort: by the time this runs the database is already the
 * truth, so a website outage must never fail or roll back an admin's change. The
 * website's short revalidate window is the safety net; the caller surfaces the
 * returned status so the admin knows when propagation is delayed.
 */

export type NotifyResult =
  | { status: "notified" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

const TIMEOUT_MS = 4000;

export async function notifyPublicSite(slug: string): Promise<NotifyResult> {
  if (!env.PUBLIC_SITE_URL || !env.PLANNER_WEBSITE_SHARED_SECRET) {
    return { status: "skipped", reason: "Public site integration is not configured." };
  }

  const body = JSON.stringify({ slugs: [slug] });
  const timestamp = String(Date.now());
  try {
    const res = await fetch(new URL("/api/revalidate", env.PUBLIC_SITE_URL), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [TIMESTAMP_HEADER]: timestamp,
        [SIGNATURE_HEADER]: signBody(body, timestamp),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { status: "failed", reason: `Website responded ${res.status}.` };
    return { status: "notified" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.error("[notify-public-site] revalidation failed:", slug, reason);
    return { status: "failed", reason: "The public website could not be reached." };
  }
}
