import "server-only";
import { prisma } from "@/server/db/prisma";
import { humanizeEnum } from "@/domain/shared/enums";
import type {
  AccommodationCategory,
  ActivityType,
  MealPlan,
  MealType,
  RoomType as RoomOccupancy,
  TransportMode,
} from "@/domain/shared/enums";
import type {
  AccommodationDetailDTO,
  ActivityDetailDTO,
  AddonDetailDTO,
  MealDetailDTO,
  RoomTypeDTO,
  TransportationDetailDTO,
} from "@/types/master-data";
import type { PriceReadOptions } from "../ports/catalogue.repositories";
import type {
  OptionCandidateDTO,
  TripOptionKind,
  TripOptionRepository,
} from "../ports/trip-option.repository";
import { toPriceDTO } from "./price-mapper";

export class PrismaTripOptionRepository implements TripOptionRepository {
  async listAccommodationOptions(
    tripId: string,
    opts: PriceReadOptions,
  ): Promise<AccommodationDetailDTO[]> {
    const rows = await prisma.tripAccommodationOption.findMany({
      where: { tripId, active: true, accommodation: { active: true } },
      orderBy: [{ sortOrder: "asc" }, { accommodation: { name: "asc" } }],
      include: {
        accommodation: {
          include: {
            destination: { select: { name: true } },
            roomTypes: { include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } } },
          },
        },
      },
    });
    return rows.map((r) => {
      const a = r.accommodation;
      return {
        id: a.id,
        name: a.name,
        destinationId: a.destinationId,
        destinationName: a.destination.name,
        category: a.category as AccommodationCategory,
        starRating: a.starRating,
        description: a.description,
        amenities: a.amenities,
        active: a.active,
        roomTypes: a.roomTypes.map(
          (rt): RoomTypeDTO => ({
            id: rt.id,
            accommodationId: rt.accommodationId,
            name: rt.name,
            occupancy: rt.occupancy as RoomOccupancy,
            category: rt.category as AccommodationCategory,
            maxOccupancy: rt.maxOccupancy,
            active: rt.active,
            prices: rt.prices.map((p) => toPriceDTO(p, opts.includeInternal)),
          }),
        ),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });
  }

  async listTransportOptions(
    tripId: string,
    opts: PriceReadOptions,
  ): Promise<TransportationDetailDTO[]> {
    const rows = await prisma.tripTransportationOption.findMany({
      where: { tripId, active: true, transportation: { active: true } },
      orderBy: [{ sortOrder: "asc" }, { transportation: { name: "asc" } }],
      include: { transportation: { include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } } } },
    });
    return rows.map((r) => {
      const t = r.transportation;
      return {
        id: t.id,
        name: t.name,
        mode: t.mode as TransportMode,
        provider: t.provider,
        vehicleType: t.vehicleType,
        capacity: t.capacity,
        routeFrom: t.routeFrom,
        routeTo: t.routeTo,
        active: t.active,
        prices: t.prices.map((p) => toPriceDTO(p, opts.includeInternal)),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });
  }

  async listActivityOptions(tripId: string, opts: PriceReadOptions): Promise<ActivityDetailDTO[]> {
    const rows = await prisma.tripActivityOption.findMany({
      where: { tripId, active: true, activity: { active: true } },
      orderBy: [{ sortOrder: "asc" }, { activity: { name: "asc" } }],
      include: {
        activity: { include: { destination: { select: { name: true } }, prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } } },
      },
    });
    return rows.map((r) => {
      const a = r.activity;
      return {
        id: a.id,
        name: a.name,
        destinationId: a.destinationId,
        destinationName: a.destination?.name ?? null,
        type: a.type as ActivityType,
        description: a.description,
        durationMinutes: a.durationMinutes,
        active: a.active,
        prices: a.prices.map((p) => toPriceDTO(p, opts.includeInternal)),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });
  }

  async listMealOptions(tripId: string, opts: PriceReadOptions): Promise<MealDetailDTO[]> {
    const rows = await prisma.tripMealOption.findMany({
      where: { tripId, active: true, meal: { active: true } },
      orderBy: [{ sortOrder: "asc" }, { meal: { name: "asc" } }],
      include: { meal: { include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } } } },
    });
    return rows.map((r) => {
      const m = r.meal;
      return {
        id: m.id,
        name: m.name,
        mealType: m.mealType as MealType,
        plan: m.plan as MealPlan,
        active: m.active,
        prices: m.prices.map((p) => toPriceDTO(p, opts.includeInternal)),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });
  }

  async listAddonOptions(tripId: string, opts: PriceReadOptions): Promise<AddonDetailDTO[]> {
    const rows = await prisma.tripAddonOption.findMany({
      where: { tripId, active: true, addon: { active: true } },
      orderBy: [{ sortOrder: "asc" }, { addon: { name: "asc" } }],
      include: { addon: { include: { prices: { orderBy: [{ active: "desc" }, { season: "asc" }] } } } },
    });
    return rows.map((r) => {
      const ad = r.addon;
      return {
        id: ad.id,
        name: ad.name,
        description: ad.description,
        active: ad.active,
        prices: ad.prices.map((p) => toPriceDTO(p, opts.includeInternal)),
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
      };
    });
  }

  async enabledIds(tripId: string, kind: TripOptionKind): Promise<Set<string>> {
    switch (kind) {
      case "accommodation": {
        const rows = await prisma.tripAccommodationOption.findMany({
          where: { tripId, active: true },
          select: { accommodationId: true },
        });
        return new Set(rows.map((r) => r.accommodationId));
      }
      case "transportation": {
        const rows = await prisma.tripTransportationOption.findMany({
          where: { tripId, active: true },
          select: { transportationId: true },
        });
        return new Set(rows.map((r) => r.transportationId));
      }
      case "activity": {
        const rows = await prisma.tripActivityOption.findMany({
          where: { tripId, active: true },
          select: { activityId: true },
        });
        return new Set(rows.map((r) => r.activityId));
      }
      case "meal": {
        const rows = await prisma.tripMealOption.findMany({
          where: { tripId, active: true },
          select: { mealId: true },
        });
        return new Set(rows.map((r) => r.mealId));
      }
      case "addon": {
        const rows = await prisma.tripAddonOption.findMany({
          where: { tripId, active: true },
          select: { addonId: true },
        });
        return new Set(rows.map((r) => r.addonId));
      }
    }
  }

  async listCandidates(tripId: string, kind: TripOptionKind): Promise<OptionCandidateDTO[]> {
    const enabled = await this.enabledIds(tripId, kind);
    switch (kind) {
      case "accommodation": {
        const rows = await prisma.accommodation.findMany({
          include: { destination: { select: { name: true } } },
          orderBy: { name: "asc" },
        });
        return rows.map((a) => ({
          id: a.id,
          name: a.name,
          subtitle: `${a.destination.name} · ${humanizeEnum(a.category)}`,
          masterActive: a.active,
          enabled: enabled.has(a.id),
          sortOrder: 0,
          isDefault: false,
        }));
      }
      case "transportation": {
        const rows = await prisma.transportation.findMany({ orderBy: { name: "asc" } });
        return rows.map((t) => ({
          id: t.id,
          name: t.name,
          subtitle: `${humanizeEnum(t.mode)} · cap ${t.capacity}`,
          masterActive: t.active,
          enabled: enabled.has(t.id),
          sortOrder: 0,
          isDefault: false,
        }));
      }
      case "activity": {
        const rows = await prisma.activity.findMany({
          include: { destination: { select: { name: true } } },
          orderBy: { name: "asc" },
        });
        return rows.map((a) => ({
          id: a.id,
          name: a.name,
          subtitle: [humanizeEnum(a.type), a.destination?.name].filter(Boolean).join(" · "),
          masterActive: a.active,
          enabled: enabled.has(a.id),
          sortOrder: 0,
          isDefault: false,
        }));
      }
      case "meal": {
        const rows = await prisma.meal.findMany({ orderBy: { name: "asc" } });
        return rows.map((m) => ({
          id: m.id,
          name: m.name,
          subtitle: `${humanizeEnum(m.mealType)} · ${m.plan}`,
          masterActive: m.active,
          enabled: enabled.has(m.id),
          sortOrder: 0,
          isDefault: false,
        }));
      }
      case "addon": {
        const rows = await prisma.addon.findMany({ orderBy: { name: "asc" } });
        return rows.map((ad) => ({
          id: ad.id,
          name: ad.name,
          subtitle: ad.description ?? undefined,
          masterActive: ad.active,
          enabled: enabled.has(ad.id),
          sortOrder: 0,
          isDefault: false,
        }));
      }
    }
  }

  async setEnabled(
    tripId: string,
    kind: TripOptionKind,
    masterId: string,
    enabled: boolean,
  ): Promise<void> {
    switch (kind) {
      case "accommodation":
        if (enabled)
          await prisma.tripAccommodationOption.upsert({
            where: { tripId_accommodationId: { tripId, accommodationId: masterId } },
            create: { tripId, accommodationId: masterId, active: true },
            update: { active: true },
          });
        else
          await prisma.tripAccommodationOption.deleteMany({
            where: { tripId, accommodationId: masterId },
          });
        return;
      case "transportation":
        if (enabled)
          await prisma.tripTransportationOption.upsert({
            where: { tripId_transportationId: { tripId, transportationId: masterId } },
            create: { tripId, transportationId: masterId, active: true },
            update: { active: true },
          });
        else
          await prisma.tripTransportationOption.deleteMany({
            where: { tripId, transportationId: masterId },
          });
        return;
      case "activity":
        if (enabled)
          await prisma.tripActivityOption.upsert({
            where: { tripId_activityId: { tripId, activityId: masterId } },
            create: { tripId, activityId: masterId, active: true },
            update: { active: true },
          });
        else await prisma.tripActivityOption.deleteMany({ where: { tripId, activityId: masterId } });
        return;
      case "meal":
        if (enabled)
          await prisma.tripMealOption.upsert({
            where: { tripId_mealId: { tripId, mealId: masterId } },
            create: { tripId, mealId: masterId, active: true },
            update: { active: true },
          });
        else await prisma.tripMealOption.deleteMany({ where: { tripId, mealId: masterId } });
        return;
      case "addon":
        if (enabled)
          await prisma.tripAddonOption.upsert({
            where: { tripId_addonId: { tripId, addonId: masterId } },
            create: { tripId, addonId: masterId, active: true },
            update: { active: true },
          });
        else await prisma.tripAddonOption.deleteMany({ where: { tripId, addonId: masterId } });
        return;
    }
  }
}

export const tripOptionRepository: TripOptionRepository = new PrismaTripOptionRepository();
