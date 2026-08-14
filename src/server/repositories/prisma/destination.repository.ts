import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { DestinationDTO, DestinationOption, Paginated } from "@/types/master-data";
import type { DestinationInput } from "@/lib/validation/destination.schema";
import type { DestinationRepository } from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";

type Row = Prisma.DestinationGetPayload<{ include: { _count: { select: { trips: true } } } }>;

function toDTO(row: Row): DestinationDTO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    region: row.region,
    country: row.country,
    description: row.description,
    active: row.active,
    tripCount: row._count.trips,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaDestinationRepository implements DestinationRepository {
  async list(query: ListQuery): Promise<Paginated<DestinationDTO>> {
    const where: Prisma.DestinationWhereInput = {};
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { region: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.status === "active") where.active = true;
    else if (query.status === "inactive") where.active = false;

    const [rows, total] = await Promise.all([
      prisma.destination.findMany({
        where,
        include: { _count: { select: { trips: true } } },
        orderBy: { name: "asc" },
        ...paginationArgs(query),
      }),
      prisma.destination.count({ where }),
    ]);

    return {
      items: rows.map(toDTO),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async listOptions(): Promise<DestinationOption[]> {
    const rows = await prisma.destination.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return rows;
  }

  async findById(id: string): Promise<DestinationDTO | null> {
    const row = await prisma.destination.findUnique({
      where: { id },
      include: { _count: { select: { trips: true } } },
    });
    return row ? toDTO(row) : null;
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    const found = await prisma.destination.findFirst({
      where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    return Boolean(found);
  }

  async create(input: DestinationInput & { slug: string }): Promise<DestinationDTO> {
    const row = await prisma.destination.create({
      data: {
        name: input.name,
        slug: input.slug,
        region: input.region || null,
        country: input.country,
        description: input.description || null,
        active: input.active,
      },
      include: { _count: { select: { trips: true } } },
    });
    return toDTO(row);
  }

  async update(id: string, input: DestinationInput & { slug: string }): Promise<DestinationDTO> {
    const row = await prisma.destination.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        region: input.region || null,
        country: input.country,
        description: input.description || null,
        active: input.active,
      },
      include: { _count: { select: { trips: true } } },
    });
    return toDTO(row);
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.destination.update({ where: { id }, data: { active } });
  }
}

export const destinationRepository: DestinationRepository = new PrismaDestinationRepository();
