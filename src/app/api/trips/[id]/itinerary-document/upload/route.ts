import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { env } from "@/config/env";
import { requirePermission } from "@/server/auth/rbac";
import { tripRepository } from "@/server/repositories";
import { isAppError } from "@/lib/errors/app-error";
import {
  MAX_PDF_BYTES,
  PDF_CONTENT_TYPE,
  isStorageConfigured,
  tripDocumentPrefix,
} from "@/server/storage/itinerary-blob";

/**
 * Issues a short-lived, narrowly-scoped CLIENT UPLOAD TOKEN for a trip's
 * itinerary PDF. The browser then uploads straight to private Blob storage.
 *
 * The token is the enforcement point: it only permits `application/pdf`, only
 * up to MAX_PDF_BYTES, and only under this trip's storage prefix. The upload is
 * still NOT trusted — registerItineraryDocumentAction re-reads the stored bytes.
 * No storage credential ever reaches the browser.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("trip:write");
  } catch (error) {
    const status = isAppError(error) ? error.httpStatus : 401;
    return NextResponse.json({ error: "Not authorised." }, { status });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Document storage is not configured." }, { status: 503 });
  }

  const { id: tripId } = await params;
  const trip = await tripRepository.findDetail(tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const prefix = tripDocumentPrefix(tripId);
  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      token: env.BLOB_READ_WRITE_TOKEN,
      request: req,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(prefix) || pathname.includes("..") || !/\.pdf$/i.test(pathname)) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: [PDF_CONTENT_TYPE],
          maximumSizeInBytes: MAX_PDF_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[itinerary-upload] token issue failed:", error);
    return NextResponse.json({ error: "Upload could not be authorised." }, { status: 400 });
  }
}
