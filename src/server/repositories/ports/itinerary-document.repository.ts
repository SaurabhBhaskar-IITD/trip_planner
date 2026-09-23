/**
 * Versioned itinerary PDFs. APPEND-ONLY: a replacement is a new version; old
 * versions are never updated or deleted because paid bookings reference them.
 *
 * `blobPathname` is deliberately absent from the display DTO — it is only
 * returned by the storage-lookup methods used server-side to stream the file.
 */
export interface ItineraryDocumentDTO {
  id: string;
  tripId: string;
  version: number;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
  uploadedAt: Date;
  uploadedById: string | null;
}

export interface ItineraryDocumentStorage {
  id: string;
  tripId: string;
  version: number;
  fileName: string;
  blobPathname: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
}

export interface NewItineraryDocument {
  fileName: string;
  blobPathname: string;
  sizeBytes: number;
  sha256: string;
  contentType: string;
}

export interface ItineraryDocumentRepository {
  /** All versions for a trip, newest first. */
  listForTrip(tripId: string): Promise<ItineraryDocumentDTO[]>;
  /** Storage location of one document (server-side streaming only). */
  findStorage(id: string): Promise<ItineraryDocumentStorage | null>;
  /** Current (highest-version) document of a trip, by slug — for the booking snapshot. */
  currentStorageBySlug(slug: string): Promise<ItineraryDocumentStorage | null>;
  /** Insert the next version atomically. */
  createNextVersion(
    tripId: string,
    data: NewItineraryDocument,
    userId: string | null,
  ): Promise<ItineraryDocumentDTO>;
}
