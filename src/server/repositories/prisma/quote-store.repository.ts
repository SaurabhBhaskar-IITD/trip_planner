import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { formatQuoteReference } from "@/lib/utils/format";
import type { ComponentKind, PricingUnit, QuoteStatus } from "@/domain/shared/enums";
import type { PlannerItineraryDoc, PlannerRequest } from "@/domain/planner/types";
import type {
  QuoteDetailDTO,
  QuoteItemDTO,
  QuoteListItemDTO,
  QuoteVersionDTO,
} from "@/types/planner";
import type {
  CreateQuoteVersionData,
  CreateQuoteItemData,
  QuoteStoreRepository,
} from "../ports/quote-store.repository";

/** Build the nested Prisma create payload for one immutable version + its items. */
function versionCreateInput(
  data: CreateQuoteVersionData,
  version: number,
): Prisma.QuoteVersionCreateWithoutQuoteInput {
  return {
    version,
    note: data.note ?? null,
    tripNameSnapshot: data.tripName,
    travelStartDate: data.travelStartDate,
    travelEndDate: data.travelEndDate,
    travellerCount: data.travellerCount,
    selectionsSnapshot: (data.selections ?? {}) as Prisma.InputJsonValue,
    itinerarySnapshot: (data.itinerary ?? {}) as Prisma.InputJsonValue,
    subtotalMinor: BigInt(data.subtotalMinor),
    discountTotalMinor: BigInt(data.discountTotalMinor),
    taxTotalMinor: BigInt(data.taxTotalMinor),
    grandTotalMinor: BigInt(data.grandTotalMinor),
    supplierCostTotalMinor:
      data.supplierCostTotalMinor === null ? null : BigInt(data.supplierCostTotalMinor),
    marginTotalMinor: data.marginTotalMinor === null ? null : BigInt(data.marginTotalMinor),
    marginPercentage: data.marginPercentage,
    pricingEngineVersion: data.pricingEngineVersion,
    createdBy: data.createdById ? { connect: { id: data.createdById } } : undefined,
    items: { create: data.items.map(itemCreateInput) },
  };
}

function itemCreateInput(item: CreateQuoteItemData): Prisma.QuoteItemCreateWithoutVersionInput {
  return {
    sortOrder: item.sortOrder,
    componentType: item.componentType,
    componentId: item.componentId ?? null,
    componentNameSnapshot: item.componentNameSnapshot,
    descriptionSnapshot: item.descriptionSnapshot ?? null,
    quantity: item.quantity,
    unit: item.unit,
    unitPriceMinor: BigInt(item.unitPriceMinor),
    lineTotalMinor: BigInt(item.lineTotalMinor),
    supplierCostMinor: item.supplierCostMinor == null ? null : BigInt(item.supplierCostMinor),
    marginMinor: item.marginMinor == null ? null : BigInt(item.marginMinor),
    marginPercentage: item.marginPercentage ?? null,
    pricingMetadataSnapshot: (item.pricingMetadataSnapshot ?? {}) as Prisma.InputJsonValue,
  };
}

const detailInclude = {
  customer: { select: { id: true, name: true, phone: true, email: true } },
  trip: { select: { name: true } },
  versions: {
    orderBy: { version: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  },
} satisfies Prisma.QuoteInclude;

type QuoteDetailRow = Prisma.QuoteGetPayload<{ include: typeof detailInclude }>;
type VersionRow = QuoteDetailRow["versions"][number];
type ItemRow = VersionRow["items"][number];

function toItemDTO(row: ItemRow, includeInternal: boolean): QuoteItemDTO {
  const base: QuoteItemDTO = {
    kind: row.componentType as ComponentKind,
    label: row.componentNameSnapshot,
    description: row.descriptionSnapshot,
    unit: row.unit as PricingUnit,
    quantity: row.quantity,
    unitPriceMinor: Number(row.unitPriceMinor),
    lineTotalMinor: Number(row.lineTotalMinor),
    meta: (row.pricingMetadataSnapshot ?? {}) as Record<string, unknown>,
  };
  if (includeInternal) {
    base.supplierCostMinor = row.supplierCostMinor == null ? null : Number(row.supplierCostMinor);
    base.marginMinor = row.marginMinor == null ? null : Number(row.marginMinor);
    base.marginPercentage = row.marginPercentage;
  }
  return base;
}

function toVersionDTO(row: VersionRow, includeInternal: boolean): QuoteVersionDTO {
  const dto: QuoteVersionDTO = {
    version: row.version,
    note: row.note,
    createdAt: row.createdAt,
    travelStartDate: row.travelStartDate,
    travelEndDate: row.travelEndDate,
    travellerCount: row.travellerCount,
    subtotalMinor: Number(row.subtotalMinor),
    discountTotalMinor: Number(row.discountTotalMinor),
    taxTotalMinor: Number(row.taxTotalMinor),
    grandTotalMinor: Number(row.grandTotalMinor),
    items: row.items.map((i) => toItemDTO(i, includeInternal)),
    itinerary: (row.itinerarySnapshot ?? {}) as unknown as PlannerItineraryDoc,
    selections: (row.selectionsSnapshot ?? {}) as unknown as PlannerRequest,
    pricingEngineVersion: row.pricingEngineVersion,
  };
  if (includeInternal) {
    dto.internal = {
      supplierCostTotalMinor:
        row.supplierCostTotalMinor == null ? null : Number(row.supplierCostTotalMinor),
      marginTotalMinor: row.marginTotalMinor == null ? null : Number(row.marginTotalMinor),
      marginPercentage: row.marginPercentage,
    };
  }
  return dto;
}

export class PrismaQuoteStoreRepository implements QuoteStoreRepository {
  async createQuote(data: {
    tripId: string;
    customerId: string;
    createdById?: string | null;
    version: CreateQuoteVersionData;
  }): Promise<{ id: string; reference: string; version: number }> {
    const year = new Date().getFullYear();
    const baseCount = await prisma.quote.count();

    // Reference is a human sequence; retry on the rare unique collision.
    for (let attempt = 0; attempt < 6; attempt++) {
      const reference = formatQuoteReference(baseCount + 1 + attempt, year);
      try {
        const created = await prisma.quote.create({
          data: {
            reference,
            trip: { connect: { id: data.tripId } },
            customer: { connect: { id: data.customerId } },
            status: "draft",
            currentVersion: 1,
            createdBy: data.createdById ? { connect: { id: data.createdById } } : undefined,
            versions: { create: [versionCreateInput(data.version, 1)] },
          },
          select: { id: true, reference: true },
        });
        return { id: created.id, reference: created.reference, version: 1 };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
    throw new Error("Could not allocate a unique quote reference.");
  }

  async addVersion(quoteId: string, data: CreateQuoteVersionData): Promise<{ version: number }> {
    return prisma.$transaction(async (tx) => {
      const last = await tx.quoteVersion.findFirst({
        where: { quoteId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const nextVersion = (last?.version ?? 0) + 1;
      await tx.quoteVersion.create({
        data: { quote: { connect: { id: quoteId } }, ...versionCreateInput(data, nextVersion) },
      });
      await tx.quote.update({
        where: { id: quoteId },
        data: { currentVersion: nextVersion },
      });
      return { version: nextVersion };
    });
  }

  async findDetail(
    id: string,
    opts: { includeInternal: boolean },
  ): Promise<QuoteDetailDTO | null> {
    const row = await prisma.quote.findUnique({ where: { id }, include: detailInclude });
    if (!row) return null;
    return {
      id: row.id,
      reference: row.reference,
      status: row.status as QuoteStatus,
      tripId: row.tripId,
      tripName: row.trip.name,
      currentVersion: row.currentVersion,
      customer: {
        id: row.customer.id,
        name: row.customer.name,
        phone: row.customer.phone,
        email: row.customer.email,
      },
      versions: row.versions.map((v) => toVersionDTO(v, opts.includeInternal)),
      createdAt: row.createdAt,
    };
  }

  async listRecent(limit: number): Promise<QuoteListItemDTO[]> {
    const rows = await prisma.quote.findMany({
      orderBy: { updatedAt: "desc" },
      take: Math.min(limit, 50),
      include: {
        customer: { select: { name: true } },
        trip: { select: { name: true } },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { grandTotalMinor: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      customerName: r.customer.name,
      tripName: r.trip.name,
      status: r.status as QuoteStatus,
      currentVersion: r.currentVersion,
      grandTotalMinor: r.versions[0] ? Number(r.versions[0].grandTotalMinor) : 0,
      updatedAt: r.updatedAt,
    }));
  }
}

export const quoteStoreRepository: QuoteStoreRepository = new PrismaQuoteStoreRepository();
