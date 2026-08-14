import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type {
  ItineraryDayDTO,
  Paginated,
  TripDetailDTO,
  TripListItemDTO,
} from "@/types/master-data";
import type { TripStatus } from "@/domain/shared/enums";
import type { TripInput } from "@/lib/validation/trip.schema";
import type { ItineraryDayInput, ItinerarySegmentInput } from "@/lib/validation/itinerary.schema";
import type { TripRepository } from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";

type Tx = Prisma.TransactionClient | PrismaClient;

const detailInclude = {
  destinations: {
    include: { destination: { select: { id: true, name: true, slug: true } } },
    orderBy: { sortOrder: "asc" },
  },
  itinerary: {
    orderBy: { dayNumber: "asc" },
    include: {
      fromDestination: { select: { name: true } },
      toDestination: { select: { name: true } },
      segments: { orderBy: { sortOrder: "asc" } },
    },
  },
} satisfies Prisma.TripInclude;

type DetailRow = Prisma.TripGetPayload<{ include: typeof detailInclude }>;

function toDetailDTO(row: DetailRow): TripDetailDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    durationDays: row.durationDays,
    durationNights: row.durationNights,
    status: row.status as TripStatus,
    version: row.version,
    destinations: row.destinations.map((td) => ({
      destinationId: td.destinationId,
      name: td.destination.name,
      slug: td.destination.slug,
      sortOrder: td.sortOrder,
    })),
    itinerary: row.itinerary.map((day): ItineraryDayDTO => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      summary: day.summary,
      fromDestinationId: day.fromDestinationId,
      toDestinationId: day.toDestinationId,
      fromName: day.fromDestination?.name ?? null,
      toName: day.toDestination?.name ?? null,
      segments: day.segments.map((s) => ({
        id: s.id,
        sortOrder: s.sortOrder,
        type: s.type,
        title: s.title,
        detail: s.detail,
        transportMode: s.transportMode,
        mealType: s.mealType,
      })),
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Two-phase renumber to keep dayNumber contiguous (1..n) without tripping the
 * @@unique([tripId, dayNumber]) constraint mid-update. */
async function renumberDays(tx: Tx, tripId: string): Promise<void> {
  const days = await tx.itineraryDay.findMany({
    where: { tripId },
    orderBy: { dayNumber: "asc" },
    select: { id: true },
  });
  for (let i = 0; i < days.length; i++) {
    await tx.itineraryDay.update({ where: { id: days[i]!.id }, data: { dayNumber: -(i + 1) } });
  }
  for (let i = 0; i < days.length; i++) {
    await tx.itineraryDay.update({ where: { id: days[i]!.id }, data: { dayNumber: i + 1 } });
  }
}

export class PrismaTripRepository implements TripRepository {
  async list(query: ListQuery): Promise<Paginated<TripListItemDTO>> {
    const where: Prisma.TripWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.status && ["draft", "active", "archived"].includes(query.status)) {
      where.status = query.status as TripStatus;
    }

    const [rows, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: {
          destinations: {
            include: { destination: { select: { name: true } } },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
        ...paginationArgs(query),
      }),
      prisma.trip.count({ where }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        status: r.status as TripStatus,
        version: r.version,
        durationDays: r.durationDays,
        durationNights: r.durationNights,
        destinationNames: r.destinations.map((d) => d.destination.name),
        updatedAt: r.updatedAt,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async findDetail(id: string): Promise<TripDetailDTO | null> {
    const row = await prisma.trip.findUnique({ where: { id }, include: detailInclude });
    return row ? toDetailDTO(row) : null;
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const found = await prisma.trip.findFirst({
      where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    return Boolean(found);
  }

  async create(input: TripInput & { slug: string }): Promise<{ id: string }> {
    const trip = await prisma.trip.create({
      data: {
        name: input.name,
        slug: input.slug,
        summary: input.summary || null,
        description: input.description || null,
        durationDays: input.durationDays,
        durationNights: input.durationNights,
        status: input.status,
        destinations: {
          create: input.destinationIds.map((destinationId, i) => ({ destinationId, sortOrder: i })),
        },
      },
      select: { id: true },
    });
    return trip;
  }

  async update(id: string, input: TripInput & { slug: string }): Promise<void> {
    // Trip scalar fields + ordered destinations must change together.
    await prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          summary: input.summary || null,
          description: input.description || null,
          durationDays: input.durationDays,
          durationNights: input.durationNights,
          status: input.status,
          version: { increment: 1 },
        },
      });
      await tx.tripDestination.deleteMany({ where: { tripId: id } });
      if (input.destinationIds.length > 0) {
        await tx.tripDestination.createMany({
          data: input.destinationIds.map((destinationId, i) => ({
            tripId: id,
            destinationId,
            sortOrder: i,
          })),
        });
      }
    });
  }

  async setStatus(id: string, status: TripStatus): Promise<void> {
    await prisma.trip.update({ where: { id }, data: { status } });
  }

  async duplicate(id: string, newSlug: string): Promise<{ id: string }> {
    return prisma.$transaction(async (tx) => {
      const source = await tx.trip.findUnique({ where: { id }, include: detailInclude });
      if (!source) throw new Error("Trip not found");

      const copy = await tx.trip.create({
        data: {
          name: `${source.name} (Copy)`,
          slug: newSlug,
          summary: source.summary,
          description: source.description,
          durationDays: source.durationDays,
          durationNights: source.durationNights,
          status: "draft",
          version: 1,
          destinations: {
            create: source.destinations.map((d) => ({
              destinationId: d.destinationId,
              sortOrder: d.sortOrder,
            })),
          },
          itinerary: {
            create: source.itinerary.map((day) => ({
              dayNumber: day.dayNumber,
              title: day.title,
              summary: day.summary,
              fromDestinationId: day.fromDestinationId,
              toDestinationId: day.toDestinationId,
              segments: {
                create: day.segments.map((s) => ({
                  sortOrder: s.sortOrder,
                  type: s.type,
                  title: s.title,
                  detail: s.detail,
                  transportMode: s.transportMode,
                  mealType: s.mealType,
                })),
              },
            })),
          },
        },
        select: { id: true },
      });
      return copy;
    });
  }

  // --- Itinerary days ----------------------------------------------------
  async addDay(tripId: string, input: ItineraryDayInput): Promise<{ id: string }> {
    const last = await prisma.itineraryDay.findFirst({
      where: { tripId },
      orderBy: { dayNumber: "desc" },
      select: { dayNumber: true },
    });
    const day = await prisma.itineraryDay.create({
      data: {
        tripId,
        dayNumber: (last?.dayNumber ?? 0) + 1,
        title: input.title,
        summary: input.summary || null,
        fromDestinationId: input.fromDestinationId || null,
        toDestinationId: input.toDestinationId || null,
      },
      select: { id: true },
    });
    return day;
  }

  async updateDay(dayId: string, input: ItineraryDayInput): Promise<void> {
    await prisma.itineraryDay.update({
      where: { id: dayId },
      data: {
        title: input.title,
        summary: input.summary || null,
        fromDestinationId: input.fromDestinationId || null,
        toDestinationId: input.toDestinationId || null,
      },
    });
  }

  async deleteDay(dayId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const day = await tx.itineraryDay.findUnique({
        where: { id: dayId },
        select: { tripId: true },
      });
      if (!day) return;
      await tx.itineraryDay.delete({ where: { id: dayId } });
      await renumberDays(tx, day.tripId);
    });
  }

  async moveDay(tripId: string, dayId: string, direction: "up" | "down"): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const days = await tx.itineraryDay.findMany({
        where: { tripId },
        orderBy: { dayNumber: "asc" },
        select: { id: true, dayNumber: true },
      });
      const idx = days.findIndex((d) => d.id === dayId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= days.length) return;
      const a = days[idx]!;
      const b = days[swapIdx]!;
      // temp value avoids the @@unique([tripId, dayNumber]) collision
      await tx.itineraryDay.update({ where: { id: a.id }, data: { dayNumber: -1 } });
      await tx.itineraryDay.update({ where: { id: b.id }, data: { dayNumber: a.dayNumber } });
      await tx.itineraryDay.update({ where: { id: a.id }, data: { dayNumber: b.dayNumber } });
    });
  }

  // --- Itinerary segments ------------------------------------------------
  async addSegment(dayId: string, input: ItinerarySegmentInput): Promise<{ id: string }> {
    const last = await prisma.itinerarySegment.findFirst({
      where: { itineraryDayId: dayId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const segment = await prisma.itinerarySegment.create({
      data: {
        itineraryDayId: dayId,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        type: input.type,
        title: input.title,
        detail: input.detail || null,
        transportMode: input.transportMode || null,
        mealType: input.mealType || null,
      },
      select: { id: true },
    });
    return segment;
  }

  async updateSegment(segmentId: string, input: ItinerarySegmentInput): Promise<void> {
    await prisma.itinerarySegment.update({
      where: { id: segmentId },
      data: {
        type: input.type,
        title: input.title,
        detail: input.detail || null,
        transportMode: input.transportMode || null,
        mealType: input.mealType || null,
      },
    });
  }

  async deleteSegment(segmentId: string): Promise<void> {
    await prisma.itinerarySegment.delete({ where: { id: segmentId } });
  }

  async moveSegment(dayId: string, segmentId: string, direction: "up" | "down"): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const segments = await tx.itinerarySegment.findMany({
        where: { itineraryDayId: dayId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      });
      const idx = segments.findIndex((s) => s.id === segmentId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= segments.length) return;
      const a = segments[idx]!;
      const b = segments[swapIdx]!;
      // no unique constraint on segment sortOrder — a direct swap is safe
      await tx.itinerarySegment.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } });
      await tx.itinerarySegment.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } });
    });
  }
}

export const tripRepository: TripRepository = new PrismaTripRepository();
