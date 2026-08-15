import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type {
  AccommodationCategory,
  RoomType as RoomOccupancy,
} from "@/domain/shared/enums";
import type {
  AccommodationDetailDTO,
  AccommodationListItemDTO,
  Paginated,
  RoomTypeDTO,
} from "@/types/master-data";
import type { AccommodationInput, RoomTypeInput } from "@/lib/validation/accommodation.schema";
import type {
  AccommodationRepository,
  PriceReadOptions,
} from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";
import { toPriceDTO } from "./price-mapper";

const listInclude = {
  destination: { select: { name: true } },
  _count: { select: { roomTypes: true } },
} satisfies Prisma.AccommodationInclude;

type ListRow = Prisma.AccommodationGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow): AccommodationListItemDTO {
  return {
    id: row.id,
    name: row.name,
    destinationId: row.destinationId,
    destinationName: row.destination.name,
    category: row.category as AccommodationCategory,
    starRating: row.starRating,
    roomTypeCount: row._count.roomTypes,
    active: row.active,
    updatedAt: row.updatedAt,
  };
}

const detailInclude = {
  destination: { select: { name: true } },
  roomTypes: {
    orderBy: { name: "asc" },
    include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } },
  },
} satisfies Prisma.AccommodationInclude;

type DetailRow = Prisma.AccommodationGetPayload<{ include: typeof detailInclude }>;

function toDetail(row: DetailRow, includeInternal: boolean): AccommodationDetailDTO {
  return {
    id: row.id,
    name: row.name,
    destinationId: row.destinationId,
    destinationName: row.destination.name,
    category: row.category as AccommodationCategory,
    starRating: row.starRating,
    description: row.description,
    amenities: row.amenities,
    active: row.active,
    roomTypes: row.roomTypes.map(
      (rt): RoomTypeDTO => ({
        id: rt.id,
        accommodationId: rt.accommodationId,
        name: rt.name,
        occupancy: rt.occupancy as RoomOccupancy,
        category: rt.category as AccommodationCategory,
        maxOccupancy: rt.maxOccupancy,
        active: rt.active,
        prices: rt.prices.map((p) => toPriceDTO(p, includeInternal)),
      }),
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAccommodationRepository implements AccommodationRepository {
  async list(query: ListQuery): Promise<Paginated<AccommodationListItemDTO>> {
    const where: Prisma.AccommodationWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { destination: { name: { contains: query.q, mode: "insensitive" } } },
      ];
    }
    if (query.status === "active") where.active = true;
    else if (query.status === "inactive") where.active = false;
    const category = query.filters.category;
    if (category) where.category = category as AccommodationCategory;

    const [rows, total] = await Promise.all([
      prisma.accommodation.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        ...paginationArgs(query),
      }),
      prisma.accommodation.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async findDetail(id: string, opts: PriceReadOptions): Promise<AccommodationDetailDTO | null> {
    const row = await prisma.accommodation.findUnique({ where: { id }, include: detailInclude });
    return row ? toDetail(row, opts.includeInternal) : null;
  }

  async create(input: AccommodationInput): Promise<{ id: string }> {
    return prisma.accommodation.create({
      data: {
        name: input.name,
        destinationId: input.destinationId,
        category: input.category,
        starRating: input.starRating ?? null,
        description: input.description || null,
        amenities: input.amenities,
        active: input.active,
      },
      select: { id: true },
    });
  }

  async update(id: string, input: AccommodationInput): Promise<void> {
    await prisma.accommodation.update({
      where: { id },
      data: {
        name: input.name,
        destinationId: input.destinationId,
        category: input.category,
        starRating: input.starRating ?? null,
        description: input.description || null,
        amenities: input.amenities,
        active: input.active,
      },
    });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.accommodation.update({ where: { id }, data: { active } });
  }

  async addRoomType(accommodationId: string, input: RoomTypeInput): Promise<{ id: string }> {
    return prisma.roomType.create({
      data: {
        accommodationId,
        name: input.name,
        occupancy: input.occupancy,
        category: input.category,
        maxOccupancy: input.maxOccupancy ?? null,
        active: input.active,
      },
      select: { id: true },
    });
  }

  async updateRoomType(roomTypeId: string, input: RoomTypeInput): Promise<void> {
    await prisma.roomType.update({
      where: { id: roomTypeId },
      data: {
        name: input.name,
        occupancy: input.occupancy,
        category: input.category,
        maxOccupancy: input.maxOccupancy ?? null,
        active: input.active,
      },
    });
  }

  async setRoomTypeActive(roomTypeId: string, active: boolean): Promise<void> {
    await prisma.roomType.update({ where: { id: roomTypeId }, data: { active } });
  }

  async deleteRoomType(roomTypeId: string): Promise<void> {
    // Prices cascade on delete (schema onDelete: Cascade). A single statement is
    // atomic, so no explicit transaction is needed for the room type + its prices.
    await prisma.roomType.delete({ where: { id: roomTypeId } });
  }

  async roomTypeParent(roomTypeId: string): Promise<string | null> {
    const rt = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      select: { accommodationId: true },
    });
    return rt?.accommodationId ?? null;
  }

  async listActiveByDestinations(destinationIds: string[]): Promise<AccommodationListItemDTO[]> {
    if (destinationIds.length === 0) return [];
    const rows = await prisma.accommodation.findMany({
      where: { active: true, destinationId: { in: destinationIds } },
      include: listInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toListItem);
  }

  async listActiveDetailByDestinations(
    destinationIds: string[],
    opts: PriceReadOptions,
  ): Promise<AccommodationDetailDTO[]> {
    if (destinationIds.length === 0) return [];
    const rows = await prisma.accommodation.findMany({
      where: { active: true, destinationId: { in: destinationIds } },
      include: detailInclude,
      orderBy: { name: "asc" },
    });
    return rows.map((r) => toDetail(r, opts.includeInternal));
  }
}

export const accommodationRepository: AccommodationRepository =
  new PrismaAccommodationRepository();
