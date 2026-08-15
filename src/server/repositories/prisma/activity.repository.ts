import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { ActivityType } from "@/domain/shared/enums";
import type {
  ActivityDetailDTO,
  ActivityListItemDTO,
  Paginated,
} from "@/types/master-data";
import type { ActivityInput } from "@/lib/validation/activity.schema";
import type { ActivityRepository, PriceReadOptions } from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";
import { toPriceDTO } from "./price-mapper";

const listInclude = {
  destination: { select: { name: true } },
  _count: { select: { prices: true } },
} satisfies Prisma.ActivityInclude;

type ListRow = Prisma.ActivityGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow): ActivityListItemDTO {
  return {
    id: row.id,
    name: row.name,
    destinationId: row.destinationId,
    destinationName: row.destination?.name ?? null,
    type: row.type as ActivityType,
    durationMinutes: row.durationMinutes,
    active: row.active,
    priceCount: row._count.prices,
    updatedAt: row.updatedAt,
  };
}

type DetailRow = Prisma.ActivityGetPayload<{
  include: { destination: { select: { name: true } }; prices: true };
}>;

function toDetail(row: DetailRow, includeInternal: boolean): ActivityDetailDTO {
  return {
    id: row.id,
    name: row.name,
    destinationId: row.destinationId,
    destinationName: row.destination?.name ?? null,
    type: row.type as ActivityType,
    description: row.description,
    durationMinutes: row.durationMinutes,
    active: row.active,
    prices: row.prices.map((p) => toPriceDTO(p, includeInternal)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaActivityRepository implements ActivityRepository {
  async list(query: ListQuery): Promise<Paginated<ActivityListItemDTO>> {
    const where: Prisma.ActivityWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { destination: { name: { contains: query.q, mode: "insensitive" } } },
      ];
    }
    if (query.status === "active") where.active = true;
    else if (query.status === "inactive") where.active = false;
    const type = query.filters.type;
    if (type) where.type = type as ActivityType;

    const [rows, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        ...paginationArgs(query),
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async findDetail(id: string, opts: PriceReadOptions): Promise<ActivityDetailDTO | null> {
    const row = await prisma.activity.findUnique({
      where: { id },
      include: {
        destination: { select: { name: true } },
        prices: { orderBy: [{ active: "desc" }, { season: "asc" }] },
      },
    });
    return row ? toDetail(row, opts.includeInternal) : null;
  }

  /** Active activities in the given destinations PLUS generic (no-destination) ones. */
  async listActiveDetailByDestinations(
    destinationIds: string[],
    opts: PriceReadOptions,
  ): Promise<ActivityDetailDTO[]> {
    const rows = await prisma.activity.findMany({
      where: {
        active: true,
        OR: [{ destinationId: { in: destinationIds } }, { destinationId: null }],
      },
      include: {
        destination: { select: { name: true } },
        prices: { orderBy: [{ active: "desc" }, { season: "asc" }] },
      },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => toDetail(r, opts.includeInternal));
  }

  async create(input: ActivityInput): Promise<{ id: string }> {
    return prisma.activity.create({
      data: {
        name: input.name,
        destinationId: input.destinationId || null,
        type: input.type,
        description: input.description || null,
        durationMinutes: input.durationMinutes ?? null,
        active: input.active,
      },
      select: { id: true },
    });
  }

  async update(id: string, input: ActivityInput): Promise<void> {
    await prisma.activity.update({
      where: { id },
      data: {
        name: input.name,
        destinationId: input.destinationId || null,
        type: input.type,
        description: input.description || null,
        durationMinutes: input.durationMinutes ?? null,
        active: input.active,
      },
    });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.activity.update({ where: { id }, data: { active } });
  }

  async listActiveByDestinations(destinationIds: string[]): Promise<ActivityListItemDTO[]> {
    if (destinationIds.length === 0) return [];
    const rows = await prisma.activity.findMany({
      where: { active: true, destinationId: { in: destinationIds } },
      include: listInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toListItem);
  }
}

export const activityRepository: ActivityRepository = new PrismaActivityRepository();
