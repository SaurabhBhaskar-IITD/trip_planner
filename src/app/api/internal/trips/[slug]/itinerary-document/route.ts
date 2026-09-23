import { NextResponse } from "next/server";
import { itineraryDocumentRepository } from "@/server/repositories";
import { hasValidBearer } from "@/server/security/shared-secret";

/**
 * SERVICE-TO-SERVICE ONLY (trip-le.com → planner, shared-secret bearer).
 *
 * Returns the storage reference of a trip's CURRENT itinerary PDF so the website
 * can freeze it onto a booking. The blob path is useless without the private
 * storage token, but it is still never exposed on a public endpoint.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!hasValidBearer(req)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401, headers: NO_STORE });
  }
  const { slug } = await params;
  if (!SLUG.test(slug)) {
    return NextResponse.json({ code: "NOT_FOUND" }, { status: 404, headers: NO_STORE });
  }

  try {
    const doc = await itineraryDocumentRepository.currentStorageBySlug(slug);
    if (!doc) return NextResponse.json({ code: "NO_DOCUMENT" }, { status: 404, headers: NO_STORE });
    return NextResponse.json(
      {
        version: doc.version,
        fileName: doc.fileName,
        blobPathname: doc.blobPathname,
        sha256: doc.sha256,
        sizeBytes: doc.sizeBytes,
        contentType: doc.contentType,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[internal-api] itinerary document lookup failed:", error);
    return NextResponse.json({ code: "UNAVAILABLE" }, { status: 503, headers: NO_STORE });
  }
}
