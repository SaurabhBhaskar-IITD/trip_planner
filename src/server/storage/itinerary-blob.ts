import "server-only";
import { createHash } from "crypto";
import { del, get, head } from "@vercel/blob";
import { env } from "@/config/env";

/**
 * Private object storage for itinerary PDFs (Vercel Blob, access: "private").
 *
 * The browser uploads the file DIRECTLY to Blob (a 12 MB PDF exceeds Vercel's
 * 4.5 MB function body limit), so nothing about the upload is trusted until the
 * server re-reads the stored bytes here and checks them independently.
 */

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const PDF_CONTENT_TYPE = "application/pdf";
const PDF_MAGIC = Buffer.from("%PDF-");

export function isStorageConfigured(): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

function token(): string {
  if (!env.BLOB_READ_WRITE_TOKEN) throw new Error("Document storage is not configured.");
  return env.BLOB_READ_WRITE_TOKEN;
}

/** Storage prefix a trip's documents must live under (checked on registration). */
export function tripDocumentPrefix(tripId: string): string {
  return `itineraries/${tripId}/`;
}

/**
 * Filename safe to show and to put in a Content-Disposition header: basename
 * only, a conservative character set, always ending in `.pdf`.
 */
export function sanitizePdfFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const stem = base
    .replace(/\.pdf$/i, "")
    .replace(/[^A-Za-z0-9 ._()-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${stem || "itinerary"}.pdf`;
}

export type InspectResult =
  | { ok: true; sizeBytes: number; sha256: string; contentType: string }
  | { ok: false; error: string };

/**
 * Verify an uploaded object really is an acceptable PDF by reading the STORED
 * bytes: exists, size bounds, declared type, and the `%PDF-` magic header (a
 * renamed executable fails here even if its extension and MIME type lie).
 */
export async function inspectUploadedPdf(pathname: string): Promise<InspectResult> {
  let meta;
  try {
    meta = await head(pathname, { token: token() });
  } catch {
    return { ok: false, error: "The uploaded file could not be found in storage." };
  }
  if (meta.size <= 0) return { ok: false, error: "The uploaded file is empty." };
  if (meta.size > MAX_PDF_BYTES) return { ok: false, error: "The PDF exceeds the 25 MB limit." };
  if (meta.contentType !== PDF_CONTENT_TYPE) return { ok: false, error: "Only PDF files are accepted." };

  const blob = await get(pathname, { access: "private", token: token() });
  if (!blob?.stream) return { ok: false, error: "The uploaded file could not be read back." };

  const hash = createHash("sha256");
  const reader = blob.stream.getReader();
  let header = Buffer.alloc(0);
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PDF_BYTES) {
      await reader.cancel();
      return { ok: false, error: "The PDF exceeds the 25 MB limit." };
    }
    if (header.length < PDF_MAGIC.length) {
      header = Buffer.concat([header, Buffer.from(value)]).subarray(0, PDF_MAGIC.length);
    }
    hash.update(value);
  }
  if (!header.equals(PDF_MAGIC)) {
    return { ok: false, error: "The file is not a valid PDF document." };
  }
  return { ok: true, sizeBytes: total, sha256: hash.digest("hex"), contentType: PDF_CONTENT_TYPE };
}

/** Stream a stored PDF (server-side only; the caller has already authorised). */
export async function openPdfStream(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  const blob = await get(pathname, { access: "private", token: token() });
  return blob?.stream ?? null;
}

/** Remove an upload that failed validation, so rejected files don't linger. */
export async function discardUpload(pathname: string): Promise<void> {
  await del(pathname, { token: token() }).catch(() => {});
}
