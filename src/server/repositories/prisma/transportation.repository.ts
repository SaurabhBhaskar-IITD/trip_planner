import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { TransportMode } from "@/domain/shared/enums";
import type {
  Paginated,
  TransportationDetailDTO,
  TransportationListItemDTO,
} from "@/types/master-data";
import type { TransportationInput } from "@/lib/validation/transportation.schema";
import type {
  PriceReadOptions,
  TransportationRepository,
} from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";
import { toPriceDTO } from "./price-mapper";

const listInclude = {
  _count: { select: { prices: true } },
} satisfies Prisma.TransportationInclude;

type ListRow = Prisma.TransportationGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow): TransportationListItemDTO {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode as TransportMode,
    provider: row.provider,
    vehicleType: row.vehicleType,
    capacity: row.capacity,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    active: row.active,
    priceCount: row._count.prices,
    updatedAt: row.updatedAt,
  };
}

type DetailRow = Prisma.TransportationGetPayload<{ include: { prices: true } }>;

function toDetail(row: DetailRow, includeInternal: boolean): TransportationDetailDTO {
  return {
    id: row.id,
    name: row.name,
    mode: row.mode as TransportMode,
    provider: row.provider,
    vehicleType: row.vehicleType,
    capacity: row.capacity,
    routeFrom: row.routeFrom,
    routeTo: row.routeTo,
    active: row.active,
    prices: row.prices.map((p) => toPriceDTO(p, includeInternal)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaTransportationRepository implements TransportationRepository {
  async list(query: ListQuery): Promise<Paginated<TransportationListItemDTO>> {
    const where: Prisma.TransportationWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { provider: { contains: query.q, mode: "insensitive" } },
        { routeFrom: { contains: query.q, mode: "insensitive" } },
        { routeTo: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.status === "active") where.active = true;
    else if (query.status === "inactive") where.active = false;
    const mode = query.filters.mode;
    if (mode) where.mode = mode as TransportMode;

    const [rows, total] = await Promise.all([
      prisma.transportation.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        ...paginationArgs(query),
      }),
      prisma.transportation.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async findDetail(id: string, opts: PriceReadOptions): Promise<TransportationDetailDTO | null> {
    const row = await prisma.transportation.findUnique({
      where: { id },
      include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } },
    });
    return row ? toDetail(row, opts.includeInternal) : null;
  }

  async listActiveDetail(opts: PriceReadOptions): Promise<TransportationDetailDTO[]> {
    const rows = await prisma.transportation.findMany({
      where: { active: true },
      include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => toDetail(r, opts.includeInternal));
  }

  async create(input: TransportationInput): Promise<{ id: string }> {
    return prisma.transportation.create({
      data: {
        name: input.name,
        mode: input.mode,
        provider: input.provider || null,
        vehicleType: input.vehicleType || null,
        capacity: input.capacity,
        routeFrom: input.routeFrom || null,
        routeTo: input.routeTo || null,
        active: input.active,
      },
      select: { id: true },
    });
  }

  async update(id: string, input: TransportationInput): Promise<void> {
    await prisma.transportation.update({
      where: { id },
      data: {
        name: input.name,
        mode: input.mode,
        provider: input.provider || null,
        vehicleType: input.vehicleType || null,
        capacity: input.capacity,
        routeFrom: input.routeFrom || null,
        routeTo: input.routeTo || null,
        active: input.active,
      },
    });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.transportation.update({ where: { id }, data: { active } });
  }

  async listActiveBrief(): Promise<TransportationListItemDTO[]> {
    const rows = await prisma.transportation.findMany({
      where: { active: true },
      include: listInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toListItem);
  }
}

export const transportationRepository: TransportationRepository =
  new PrismaTransportationRepository();
