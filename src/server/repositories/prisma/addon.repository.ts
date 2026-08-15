import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { AddonDetailDTO, AddonListItemDTO, Paginated } from "@/types/master-data";
import type { AddonInput } from "@/lib/validation/addon.schema";
import type { AddonRepository, PriceReadOptions } from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";
import { toPriceDTO } from "./price-mapper";

const listInclude = {
  _count: { select: { prices: true } },
} satisfies Prisma.AddonInclude;

type ListRow = Prisma.AddonGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow): AddonListItemDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    priceCount: row._count.prices,
    updatedAt: row.updatedAt,
  };
}

type DetailRow = Prisma.AddonGetPayload<{ include: { prices: true } }>;

function toDetail(row: DetailRow, includeInternal: boolean): AddonDetailDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    active: row.active,
    prices: row.prices.map((p) => toPriceDTO(p, includeInternal)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAddonRepository implements AddonRepository {
  async list(query: ListQuery): Promise<Paginated<AddonListItemDTO>> {
    const where: Prisma.AddonWhereInput = {};
    if (query.q) where.name = { contains: query.q, mode: "insensitive" };
    if (query.status === "active") where.active = true;
    else if (query.status === "inactive") where.active = false;

    const [rows, total] = await Promise.all([
      prisma.addon.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        ...paginationArgs(query),
      }),
      prisma.addon.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async findDetail(id: string, opts: PriceReadOptions): Promise<AddonDetailDTO | null> {
    const row = await prisma.addon.findUnique({
      where: { id },
      include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } },
    });
    return row ? toDetail(row, opts.includeInternal) : null;
  }

  async listActiveDetail(opts: PriceReadOptions): Promise<AddonDetailDTO[]> {
    const rows = await prisma.addon.findMany({
      where: { active: true },
      include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => toDetail(r, opts.includeInternal));
  }

  async create(input: AddonInput): Promise<{ id: string }> {
    return prisma.addon.create({
      data: {
        name: input.name,
        description: input.description || null,
        active: input.active,
      },
      select: { id: true },
    });
  }

  async update(id: string, input: AddonInput): Promise<void> {
    await prisma.addon.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description || null,
        active: input.active,
      },
    });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.addon.update({ where: { id }, data: { active } });
  }

  async listActiveBrief(): Promise<AddonListItemDTO[]> {
    const rows = await prisma.addon.findMany({
      where: { active: true },
      include: listInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toListItem);
  }
}

export const addonRepository: AddonRepository = new PrismaAddonRepository();
