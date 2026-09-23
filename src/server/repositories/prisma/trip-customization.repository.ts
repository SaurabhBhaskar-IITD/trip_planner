import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { PricingUnit, Season, TripStatus } from "@/domain/shared/enums";
import type { PriceDTO } from "@/types/master-data";
import type {
  CustomizationPatch,
  CustomizationRowDTO,
  PublicTripRecord,
  TripCustomizationRepository,
} from "../ports/trip-customization.repository";

/**
 * Explicit allow-list of price columns. `supplierCostMinor` is deliberately NOT
 * selected: data that is never read can never leak to a public surface.
 */
const ROW_SELECT = Prisma.validator<Prisma.TripAddonOptionSelect>()({
  addonId: true,
  active: true,
  sortOrder: true,
  isDefault: true,
  exclusiveGroup: true,
  descriptionOverride: true,
  priceOverrideMinor: true,
  priceOverrideUnit: true,
  updatedAt: true,
  updatedById: true,
  addon: {
    select: {
      name: true,
      description: true,
      active: true,
      prices: {
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          unit: true,
          season: true,
          validFrom: true,
          validUntil: true,
          active: true,
        },
        orderBy: [{ active: "desc" }, { season: "asc" }],
      },
    },
  },
});

interface RawPrice {
  id: string;
  amountMinor: bigint;
  currency: string;
  unit: string;
  season: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  active: boolean;
}

function toPublicPrice(p: RawPrice): PriceDTO {
  return {
    id: p.id,
    amountMinor: Number(p.amountMinor),
    currency: p.currency,
    unit: p.unit as PricingUnit,
    season: (p.season as Season | null) ?? null,
    validFrom: p.validFrom,
    validUntil: p.validUntil,
    minPax: null,
    maxPax: null,
    active: p.active,
  };
}

interface RawRow {
  addonId: string;
  active: boolean;
  sortOrder: number;
  isDefault: boolean;
  exclusiveGroup: string | null;
  descriptionOverride: string | null;
  priceOverrideMinor: bigint | null;
  priceOverrideUnit: string | null;
  updatedAt: Date;
  updatedById: string | null;
  addon: { name: string; description: string | null; active: boolean; prices: RawPrice[] };
}

function toRow(r: RawRow): CustomizationRowDTO {
  return {
    addonId: r.addonId,
    name: r.addon.name,
    masterDescription: r.addon.description,
    descriptionOverride: r.descriptionOverride,
    masterActive: r.addon.active,
    active: r.active,
    sortOrder: r.sortOrder,
    isDefault: r.isDefault,
    exclusiveGroup: r.exclusiveGroup,
    priceOverrideMinor: r.priceOverrideMinor == null ? null : Number(r.priceOverrideMinor),
    priceOverrideUnit: (r.priceOverrideUnit as PricingUnit | null) ?? null,
    masterPrices: r.addon.prices.map(toPublicPrice),
    updatedAt: r.updatedAt,
    updatedById: r.updatedById,
  };
}

const ORDER: Prisma.TripAddonOptionOrderByWithRelationInput[] = [
  { sortOrder: "asc" },
  { addon: { name: "asc" } },
];

export class PrismaTripCustomizationRepository implements TripCustomizationRepository {
  async listForTrip(tripId: string): Promise<CustomizationRowDTO[]> {
    const rows = await prisma.tripAddonOption.findMany({
      where: { tripId },
      orderBy: ORDER,
      select: ROW_SELECT,
    });
    return rows.map(toRow);
  }

  async attach(tripId: string, addonId: string, userId: string | null): Promise<void> {
    await prisma.tripAddonOption.upsert({
      where: { tripId_addonId: { tripId, addonId } },
      // New customizations start INACTIVE so nothing unpriced goes public by accident.
      create: { tripId, addonId, active: false, updatedById: userId },
      update: {},
    });
  }

  async setActive(tripId: string, addonId: string, active: boolean, userId: string | null): Promise<void> {
    await prisma.tripAddonOption.update({
      where: { tripId_addonId: { tripId, addonId } },
      data: { active, updatedById: userId },
    });
  }

  async update(
    tripId: string,
    addonId: string,
    patch: CustomizationPatch,
    userId: string | null,
  ): Promise<void> {
    const data: Record<string, unknown> = { updatedById: userId };
    if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;
    if (patch.isDefault !== undefined) data.isDefault = patch.isDefault;
    if (patch.exclusiveGroup !== undefined) data.exclusiveGroup = patch.exclusiveGroup;
    if (patch.descriptionOverride !== undefined) data.descriptionOverride = patch.descriptionOverride;
    if (patch.priceOverride !== undefined) {
      data.priceOverrideMinor =
        patch.priceOverride === null ? null : BigInt(patch.priceOverride.amountMinor);
      data.priceOverrideUnit = patch.priceOverride === null ? null : patch.priceOverride.unit;
    }
    await prisma.tripAddonOption.update({
      where: { tripId_addonId: { tripId, addonId } },
      data,
    });
  }

  async findPublicBySlug(slug: string): Promise<PublicTripRecord | null> {
    // One round-trip: trip + its active customizations with public price columns.
    const trip = await prisma.trip.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        durationDays: true,
        durationNights: true,
        status: true,
        publicOptionsEnabled: true,
        addonOptions: { where: { active: true }, orderBy: ORDER, select: ROW_SELECT },
      },
    });
    if (!trip) return null;
    return {
      id: trip.id,
      slug: trip.slug,
      name: trip.name,
      durationDays: trip.durationDays,
      durationNights: trip.durationNights,
      status: trip.status as TripStatus,
      publicOptionsEnabled: trip.publicOptionsEnabled,
      customizations: trip.addonOptions.map(toRow),
    };
  }

  async priceOverrides(tripId: string): Promise<Map<string, { amountMinor: number; unit: PricingUnit }>> {
    const rows = await prisma.tripAddonOption.findMany({
      where: { tripId, priceOverrideMinor: { not: null }, priceOverrideUnit: { not: null } },
      select: { addonId: true, priceOverrideMinor: true, priceOverrideUnit: true },
    });
    return new Map(
      rows.map((r) => [
        r.addonId,
        { amountMinor: Number(r.priceOverrideMinor), unit: r.priceOverrideUnit as PricingUnit },
      ]),
    );
  }
}

export const tripCustomizationRepository: TripCustomizationRepository =
  new PrismaTripCustomizationRepository();
