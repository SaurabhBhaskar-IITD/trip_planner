import "server-only";
import { prisma } from "@/server/db/prisma";
import type { PriceWriteInput } from "@/lib/validation/pricing.schema";
import type { PriceValidityWindow } from "@/domain/pricing/validity";
import type { PriceParentKind, PricingUnit, Season } from "@/domain/shared/enums";
import type { PricingRepository } from "../ports/catalogue.repositories";

/**
 * One pricing repository for all five price tables, dispatched by `kind`. Prisma
 * delegates are strongly typed and cannot be unified generically without losing
 * safety, so each operation switches on kind — but the SHAPE of the logic (and
 * therefore the app-level pricing rules) lives in exactly one place.
 *
 * For `accommodation`, `parentId` is a RoomType id; every other kind prices the
 * parent record directly.
 */

/** Common create/update payload shared by every price table. */
function baseData(input: PriceWriteInput) {
  return {
    amountMinor: BigInt(input.amountMinor),
    unit: input.unit,
    supplierCostMinor: input.supplierCostMinor === null ? null : BigInt(input.supplierCostMinor),
    season: input.season,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    active: input.active,
  };
}

const windowSelect = {
  id: true,
  unit: true,
  season: true,
  validFrom: true,
  validUntil: true,
  active: true,
} as const;

function toWindow(r: {
  id: string;
  unit: string;
  season: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  active: boolean;
}): PriceValidityWindow {
  return {
    id: r.id,
    unit: r.unit as PricingUnit,
    season: (r.season as Season | null) ?? null,
    validFrom: r.validFrom,
    validUntil: r.validUntil,
    active: r.active,
  };
}

export class PrismaPricingRepository implements PricingRepository {
  async listWindows(kind: PriceParentKind, parentId: string): Promise<PriceValidityWindow[]> {
    switch (kind) {
      case "accommodation": {
        const rows = await prisma.accommodationPrice.findMany({
          where: { roomTypeId: parentId },
          select: windowSelect,
        });
        return rows.map(toWindow);
      }
      case "transportation": {
        const rows = await prisma.transportationPrice.findMany({
          where: { transportationId: parentId },
          select: windowSelect,
        });
        return rows.map(toWindow);
      }
      case "activity": {
        const rows = await prisma.activityPrice.findMany({
          where: { activityId: parentId },
          select: windowSelect,
        });
        return rows.map(toWindow);
      }
      case "meal": {
        const rows = await prisma.mealPrice.findMany({
          where: { mealId: parentId },
          select: windowSelect,
        });
        return rows.map(toWindow);
      }
      case "addon": {
        const rows = await prisma.addonPrice.findMany({
          where: { addonId: parentId },
          select: windowSelect,
        });
        return rows.map(toWindow);
      }
    }
  }

  async getParentId(kind: PriceParentKind, priceId: string): Promise<string | null> {
    switch (kind) {
      case "accommodation": {
        const r = await prisma.accommodationPrice.findUnique({
          where: { id: priceId },
          select: { roomTypeId: true },
        });
        return r?.roomTypeId ?? null;
      }
      case "transportation": {
        const r = await prisma.transportationPrice.findUnique({
          where: { id: priceId },
          select: { transportationId: true },
        });
        return r?.transportationId ?? null;
      }
      case "activity": {
        const r = await prisma.activityPrice.findUnique({
          where: { id: priceId },
          select: { activityId: true },
        });
        return r?.activityId ?? null;
      }
      case "meal": {
        const r = await prisma.mealPrice.findUnique({
          where: { id: priceId },
          select: { mealId: true },
        });
        return r?.mealId ?? null;
      }
      case "addon": {
        const r = await prisma.addonPrice.findUnique({
          where: { id: priceId },
          select: { addonId: true },
        });
        return r?.addonId ?? null;
      }
    }
  }

  async create(
    kind: PriceParentKind,
    parentId: string,
    input: PriceWriteInput,
  ): Promise<{ id: string }> {
    const data = baseData(input);
    switch (kind) {
      case "accommodation":
        return prisma.accommodationPrice.create({
          data: { ...data, roomTypeId: parentId, minPax: input.minPax, maxPax: input.maxPax },
          select: { id: true },
        });
      case "transportation":
        return prisma.transportationPrice.create({
          data: { ...data, transportationId: parentId },
          select: { id: true },
        });
      case "activity":
        return prisma.activityPrice.create({
          data: { ...data, activityId: parentId },
          select: { id: true },
        });
      case "meal":
        return prisma.mealPrice.create({
          data: { ...data, mealId: parentId },
          select: { id: true },
        });
      case "addon":
        return prisma.addonPrice.create({
          data: { ...data, addonId: parentId },
          select: { id: true },
        });
    }
  }

  async update(kind: PriceParentKind, priceId: string, input: PriceWriteInput): Promise<void> {
    const data = baseData(input);
    switch (kind) {
      case "accommodation":
        await prisma.accommodationPrice.update({
          where: { id: priceId },
          data: { ...data, minPax: input.minPax, maxPax: input.maxPax },
        });
        return;
      case "transportation":
        await prisma.transportationPrice.update({ where: { id: priceId }, data });
        return;
      case "activity":
        await prisma.activityPrice.update({ where: { id: priceId }, data });
        return;
      case "meal":
        await prisma.mealPrice.update({ where: { id: priceId }, data });
        return;
      case "addon":
        await prisma.addonPrice.update({ where: { id: priceId }, data });
        return;
    }
  }

  async setActive(kind: PriceParentKind, priceId: string, active: boolean): Promise<void> {
    switch (kind) {
      case "accommodation":
        await prisma.accommodationPrice.update({ where: { id: priceId }, data: { active } });
        return;
      case "transportation":
        await prisma.transportationPrice.update({ where: { id: priceId }, data: { active } });
        return;
      case "activity":
        await prisma.activityPrice.update({ where: { id: priceId }, data: { active } });
        return;
      case "meal":
        await prisma.mealPrice.update({ where: { id: priceId }, data: { active } });
        return;
      case "addon":
        await prisma.addonPrice.update({ where: { id: priceId }, data: { active } });
        return;
    }
  }

  async delete(kind: PriceParentKind, priceId: string): Promise<void> {
    switch (kind) {
      case "accommodation":
        await prisma.accommodationPrice.delete({ where: { id: priceId } });
        return;
      case "transportation":
        await prisma.transportationPrice.delete({ where: { id: priceId } });
        return;
      case "activity":
        await prisma.activityPrice.delete({ where: { id: priceId } });
        return;
      case "meal":
        await prisma.mealPrice.delete({ where: { id: priceId } });
        return;
      case "addon":
        await prisma.addonPrice.delete({ where: { id: priceId } });
        return;
    }
  }
}

export const pricingRepository: PricingRepository = new PrismaPricingRepository();
