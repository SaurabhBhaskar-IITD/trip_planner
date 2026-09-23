import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type {
  ItineraryDocumentDTO,
  ItineraryDocumentRepository,
  ItineraryDocumentStorage,
  NewItineraryDocument,
} from "../ports/itinerary-document.repository";

const DISPLAY_SELECT = {
  id: true,
  tripId: true,
  version: true,
  fileName: true,
  sizeBytes: true,
  sha256: true,
  contentType: true,
  uploadedAt: true,
  uploadedById: true,
} as const;

const STORAGE_SELECT = {
  id: true,
  tripId: true,
  version: true,
  fileName: true,
  blobPathname: true,
  sizeBytes: true,
  sha256: true,
  contentType: true,
} as const;

/** Concurrent uploads race for the same version; the unique index lets one win. */
const MAX_VERSION_ATTEMPTS = 5;

export class PrismaItineraryDocumentRepository implements ItineraryDocumentRepository {
  async listForTrip(tripId: string): Promise<ItineraryDocumentDTO[]> {
    return prisma.itineraryDocument.findMany({
      where: { tripId },
      orderBy: { version: "desc" },
      select: DISPLAY_SELECT,
    });
  }

  async findStorage(id: string): Promise<ItineraryDocumentStorage | null> {
    return prisma.itineraryDocument.findUnique({ where: { id }, select: STORAGE_SELECT });
  }

  async currentStorageBySlug(slug: string): Promise<ItineraryDocumentStorage | null> {
    return prisma.itineraryDocument.findFirst({
      where: { trip: { slug } },
      orderBy: { version: "desc" },
      select: STORAGE_SELECT,
    });
  }

  async createNextVersion(
    tripId: string,
    data: NewItineraryDocument,
    userId: string | null,
  ): Promise<ItineraryDocumentDTO> {
    // No interactive transaction: at READ COMMITTED it would not prevent two
    // writers reading the same "latest" anyway — the UNIQUE (tripId, version)
    // index does. A loser gets P2002 and simply retries with the next number.
    // (Interactive transactions also failed under latency with "unable to start
    // a transaction in the given time", which this design cannot hit.)
    for (let attempt = 1; ; attempt++) {
      try {
        const latest = await prisma.itineraryDocument.findFirst({
          where: { tripId },
          orderBy: { version: "desc" },
          select: { version: true },
        });
        return await prisma.itineraryDocument.create({
          data: { tripId, version: (latest?.version ?? 0) + 1, uploadedById: userId, ...data },
          select: DISPLAY_SELECT,
        });
      } catch (error) {
        const lostRace =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!lostRace || attempt >= MAX_VERSION_ATTEMPTS) throw error;
      }
    }
  }
}

export const itineraryDocumentRepository: ItineraryDocumentRepository =
  new PrismaItineraryDocumentRepository();
