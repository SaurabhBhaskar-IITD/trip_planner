import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/config/env";

/**
 * Service-to-service trust between the planner and trip-le.com, using ONE shared
 * secret (PLANNER_WEBSITE_SHARED_SECRET) in both directions:
 *
 *   website → planner  `Authorization: Bearer <secret>` on /api/internal/*
 *   planner → website  HMAC-SHA256 signature over `${timestamp}.${body}`
 *
 * Every comparison is constant-time. Signed requests carry a timestamp so a
 * captured request cannot be replayed outside a short window.
 */

export const SIGNATURE_HEADER = "x-trip-le-signature";
export const TIMESTAMP_HEADER = "x-trip-le-timestamp";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isSharedSecretConfigured(): boolean {
  return Boolean(env.PLANNER_WEBSITE_SHARED_SECRET);
}

/** True only for a request bearing the exact shared secret. Fails closed if unset. */
export function hasValidBearer(request: Request): boolean {
  const secret = env.PLANNER_WEBSITE_SHARED_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  return match ? safeEqual(match[1]!, secret) : false;
}

/** Signature for an outbound body (used when notifying the website). */
export function signBody(body: string, timestamp: string): string {
  const secret = env.PLANNER_WEBSITE_SHARED_SECRET;
  if (!secret) throw new Error("PLANNER_WEBSITE_SHARED_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}
