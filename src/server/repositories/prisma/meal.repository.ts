import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { MealPlan, MealType } from "@/domain/shared/enums";
import type { MealDetailDTO, MealListItemDTO, Paginated } from "@/types/master-data";
import type { MealInput } from "@/lib/validation/meal.schema";
import type { MealRepository, PriceReadOptions } from "../ports/catalogue.repositories";
import { pageCount, paginationArgs, type ListQuery } from "../query";
import { toPriceDTO } from "./price-mapper";

const listInclude = {
  _count: { select: { prices: true } },
} satisfies Prisma.MealInclude;

type ListRow = Prisma.MealGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow): MealListItemDTO {
  return {
    id: row.id,
    name: row.name,
    mealType: row.mealType as MealType,
    plan: row.plan as MealPlan,
    active: row.active,
    priceCount: row._count.prices,
    updatedAt: row.updatedAt,
  };
}

export class PrismaMealRepository implements MealRepository {
  async list(query: ListQuery): Promise<Paginated<MealListItemDTO>> {
    const where: Prisma.MealWhereInput = {};
    if (query.q) where.name = { contains: query.q, mode: "insensitive" };
    if (query.status === "active") where.active = true;
    else if (query.status === "inactive") where.active = false;
    const plan = query.filters.plan;
    if (plan) where.plan = plan as MealPlan;

    const [rows, total] = await Promise.all([
      prisma.meal.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        ...paginationArgs(query),
      }),
      prisma.meal.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      total,
      page: query.page,
      pageSize: query.pageSize,
      pageCount: pageCount(total, query.pageSize),
    };
  }

  async findDetail(id: string, opts: PriceReadOptions): Promise<MealDetailDTO | null> {
    const row = await prisma.meal.findUnique({
      where: { id },
      include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      mealType: row.mealType as MealType,
      plan: row.plan as MealPlan,
      active: row.active,
      prices: row.prices.map((p) => toPriceDTO(p, opts.includeInternal)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(input: MealInput): Promise<{ id: string }> {
    return prisma.meal.create({
      data: {
        name: input.name,
        mealType: input.mealType,
        plan: input.plan,
        active: input.active,
      },
      select: { id: true },
    });
  }

  async update(id: string, input: MealInput): Promise<void> {
    await prisma.meal.update({
      where: { id },
      data: {
        name: input.name,
        mealType: input.mealType,
        plan: input.plan,
        active: input.active,
      },
    });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    await prisma.meal.update({ where: { id }, data: { active } });
  }

  async listActiveBrief(): Promise<MealListItemDTO[]> {
    const rows = await prisma.meal.findMany({
      where: { active: true },
      include: listInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toListItem);
  }
}

export const mealRepository: MealRepository = new PrismaMealRepository();
