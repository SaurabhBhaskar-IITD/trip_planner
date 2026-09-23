import { NextResponse } from "next/server";
import { requirePermission } from "@/server/auth/rbac";
import { itineraryDocumentRepository } from "@/server/repositories";
import { isAppError } from "@/lib/errors/app-error";
import { openPdfStream } from "@/server/storage/itinerary-blob";

/**
 * Planner staff preview/download of any itinerary version. The PDF is streamed
 * through this authorised route from PRIVATE storage — the storage URL is never
 * handed to the browser. `?download=1` switches to an attachment.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("trip:read");
  } catch (error) {
    const status = isAppError(error) ? error.httpStatus : 401;
    return NextResponse.json({ error: "Not authorised." }, { status });
  }

  const { id } = await params;
  const doc = await itineraryDocumentRepository.findStorage(id);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const stream = await openPdfStream(doc.blobPathname).catch(() => null);
  if (!stream) return NextResponse.json({ error: "Document is unavailable." }, { status: 502 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  // fileName is sanitised at registration to a header-safe character set.
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
