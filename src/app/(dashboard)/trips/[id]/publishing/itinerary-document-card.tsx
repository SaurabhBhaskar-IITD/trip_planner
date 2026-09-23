"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Download, Eye, FileText, Loader2, Upload } from "lucide-react";
import { registerItineraryDocumentAction } from "@/server/actions/trip-publishing.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import type { DocumentView } from "./types";

const MAX_BYTES = 25 * 1024 * 1024;

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/**
 * The trip's itinerary PDF — delivered to customers only after payment.
 * Replacing it creates a NEW version; bookings keep the version they bought.
 *
 * The browser uploads straight to private storage (large PDFs exceed the
 * serverless request limit), then the server re-validates the stored bytes
 * before recording the version. Client checks here are just fast feedback.
 */
export function ItineraryDocumentCard({
  tripId,
  documents,
  canWrite,
  storageConfigured,
}: {
  tripId: string;
  documents: DocumentView[];
  canWrite: boolean;
  storageConfigured: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const current = documents[0];
  const busy = progress !== null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      setError("The PDF must be between 1 byte and 25 MB.");
      return;
    }

    setProgress(0);
    try {
      const safeStem = file.name.replace(/\.pdf$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "itinerary";
      const blob = await upload(`itineraries/${tripId}/${safeStem}.pdf`, file, {
        access: "private",
        contentType: "application/pdf",
        handleUploadUrl: `/api/trips/${tripId}/itinerary-document/upload`,
        multipart: file.size > 5 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const res = await registerItineraryDocumentAction(tripId, blob.pathname, file.name);
      if (!res.ok) setError(res.message);
      else {
        setNotice(`Uploaded as version ${res.data.version}. Existing bookings keep their original version.`);
        router.refresh();
      }
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Itinerary document</CardTitle>
        {canWrite && storageConfigured ? (
          <>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
              aria-label="Choose itinerary PDF"
            />
            <Button size="sm" variant={current ? "outline" : "default"} onClick={() => input.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload />}
              {current ? "Replace PDF" : "Upload PDF"}
            </Button>
          </>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!storageConfigured ? (
          <p className="text-muted-foreground">Document storage is not configured in this environment.</p>
        ) : null}

        {current ? (
          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <FileText className="mt-0.5 size-5 shrink-0 text-accent-ink" />
              <div className="min-w-0">
                <div className="truncate font-medium">{current.fileName}</div>
                <div className="text-xs text-muted-foreground">
                  Version {current.version} · {formatSize(current.sizeBytes)} · uploaded {formatDate(current.uploadedAt)}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/itinerary-documents/${current.id}/file`} target="_blank" rel="noopener noreferrer">
                  <Eye />
                  Preview
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/itinerary-documents/${current.id}/file?download=1`}>
                  <Download />
                  Download
                </a>
              </Button>
            </div>
          </div>
        ) : storageConfigured ? (
          <p className="text-muted-foreground">No itinerary PDF yet. Customers receive it after payment.</p>
        ) : null}

        {busy ? (
          <div className="space-y-1" role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {notice ? <p role="status" className="text-muted-foreground">{notice}</p> : null}

        {documents.length > 1 ? (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Version history ({documents.length})
            </summary>
            <ul className="mt-2 divide-y rounded-md border">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">
                    v{d.version} · {d.fileName} · {formatDate(d.uploadedAt)}
                  </span>
                  <a className="shrink-0 text-accent-ink hover:underline" href={`/api/itinerary-documents/${d.id}/file`} target="_blank" rel="noopener noreferrer">
                    Preview
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
