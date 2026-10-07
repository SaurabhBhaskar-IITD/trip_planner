import { NextResponse } from "next/server";
import { getPublicTripOptions } from "@/server/public/public-catalog.service";

/**
 * PUBLIC, unauthenticated: a published trip's customer-safe customizations.
 *
 *   200  { trip, options[], configVersion }
 *   404  { code: "TRIP_NOT_FOUND" }     slug is not managed by the planner
 *   404  { code: "TRIP_UNPUBLISHED" }   managed, but not open for booking
 *   503  { code: "UNAVAILABLE" }        planner/database problem — callers fail closed
 *
 * `no-store`: the booking website owns caching and is told to revalidate on
 * every planner change. A CDN copy here would defeat that invalidation.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 120) {
    return NextResponse.json({ code: "TRIP_NOT_FOUND" }, { status: 404, headers: NO_STORE });
  }
  // `?v=2` = categorised hotel/travel upgrades with every pricing basis. Anything
  // else gets the original v1 contract, so an older website keeps working.
  const version = new URL(req.url).searchParams.get("v") === "2" ? 2 : 1;

  try {
    const result = version === 2 ? await getPublicTripOptions(slug, 2) : await getPublicTripOptions(slug, 1);
    if (result.status === "not_found")
      return NextResponse.json({ code: "TRIP_NOT_FOUND" }, { status: 404, headers: NO_STORE });
    if (result.status === "unpublished")
      return NextResponse.json({ code: "TRIP_UNPUBLISHED" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(result.data, { headers: NO_STORE });
  } catch (error) {
    console.error("[public-api] trip options failed:", error);
    return NextResponse.json({ code: "UNAVAILABLE" }, { status: 503, headers: NO_STORE });
  }
}
