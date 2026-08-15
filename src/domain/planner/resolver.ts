import { Money } from "@/domain/shared/money";
import { humanizeEnum, type PricingUnit } from "@/domain/shared/enums";
import type { ResolvedLineInput } from "@/domain/pricing/types";
import type { PriceDTO, RoomTypeDTO } from "@/types/master-data";
import { allocateRooms, allocateVehicles } from "./allocation";
import { resolvePrice } from "./price-resolver";
import type { AllocationInfo, ResolveInput, ResolveResult, ResolvedLineMeta } from "./types";

/**
 * Turn a validated planner configuration into deterministic, priced line inputs
 * for the existing pricing engine (`computePrice`). This is where §6/§10/§11's
 * central rule lives: the PRICING UNIT — not a blanket ×travellers — decides how a
 * stored price is multiplied out. Every price comes from the database via
 * `resolvePrice`; anything missing becomes a blocking problem (§1, §35), never a
 * guessed value.
 */

interface QtyContext {
  travellers: number;
  nights: number;
  days: number;
  rooms: number;
  vehicles: number;
}

/** Quantity a unit multiplies by. Returns null for units unsupported in the MVP. */
function quantityForUnit(unit: PricingUnit, ctx: QtyContext): number | null {
  switch (unit) {
    case "per_person":
      return ctx.travellers;
    case "per_room":
      return ctx.rooms;
    case "per_night":
      return ctx.nights;
    case "per_room_per_night":
      return ctx.rooms * ctx.nights;
    case "per_person_per_night":
      return ctx.travellers * ctx.nights;
    case "per_vehicle":
      return ctx.vehicles;
    case "per_day":
      return ctx.days;
    case "per_group":
    case "fixed":
      return 1;
    case "percentage":
      return null; // percentage pricing is a Phase-3 rule, not an MVP line
  }
}

function allocationNote(unit: PricingUnit, ctx: QtyContext): string {
  const p = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  switch (unit) {
    case "per_person":
      return p(ctx.travellers, "traveller");
    case "per_room":
      return p(ctx.rooms, "room");
    case "per_night":
      return p(ctx.nights, "night");
    case "per_room_per_night":
      return `${p(ctx.rooms, "room")} × ${p(ctx.nights, "night")}`;
    case "per_person_per_night":
      return `${p(ctx.travellers, "traveller")} × ${p(ctx.nights, "night")}`;
    case "per_vehicle":
      return p(ctx.vehicles, "vehicle");
    case "per_day":
      return p(ctx.days, "day");
    case "per_group":
    case "fixed":
      return "1 flat";
    case "percentage":
      return "percentage";
  }
}

function findRoomType(roomTypes: RoomTypeDTO[], occupancy: string): RoomTypeDTO | undefined {
  return roomTypes.find((rt) => rt.active && rt.occupancy === occupancy);
}

export function resolveConfiguration(input: ResolveInput): ResolveResult {
  const problems: string[] = [];
  const lines: ResolvedLineInput[] = [];
  const meta: ResolvedLineMeta[] = [];

  const nights = input.durationNights;
  const days = input.durationDays;
  const travellers = input.travellerCount;

  if (travellers < 1) problems.push("At least one traveller is required.");

  const allocation: AllocationInfo = { nights, days, travellerCount: travellers };

  /** Resolve a component's price or record a precise blocking problem (§8/§14/§35). */
  function pickPrice(prices: PriceDTO[], label: string): PriceDTO | null {
    const r = resolvePrice(prices, { travelDate: input.travelDate });
    if (r.status === "ok") return r.price;
    if (r.status === "none") problems.push(`Price is not configured for ${label}.`);
    else
      problems.push(
        `Multiple active prices match ${label} — pricing is ambiguous; disable all but one.`,
      );
    return null;
  }

  // --- Accommodation -----------------------------------------------------
  let rooms = 0;
  if (input.accommodation && input.occupancy) {
    const acc = input.accommodation;
    const roomType = findRoomType(acc.roomTypes, input.occupancy);
    if (!roomType) {
      problems.push(
        `${humanizeEnum(input.occupancy)} sharing is not configured for ${acc.name}.`,
      );
    } else {
      rooms = allocateRooms(travellers, input.occupancy);
      allocation.occupancy = input.occupancy;
      allocation.rooms = rooms;
      allocation.roomTypeName = roomType.name;
      const label = `${acc.name} — ${roomType.name} (${humanizeEnum(input.occupancy)})`;
      const price = pickPrice(roomType.prices, label);
      if (price) {
        pushLine({
          price,
          kind: "accommodation",
          label,
          ctx: { travellers, nights, days, rooms, vehicles: 0 },
        });
      }
    }
  }

  // --- Transport ---------------------------------------------------------
  let vehicles = 0;
  if (input.transport) {
    const t = input.transport;
    if (t.capacity <= 0) {
      problems.push(`Vehicle capacity is not configured for ${t.name}.`);
    } else {
      vehicles = allocateVehicles(travellers, t.capacity);
    }
    allocation.vehicleName = t.name;
    allocation.vehicleCapacity = t.capacity;
    allocation.vehicles = vehicles;
    const price = pickPrice(t.prices, `transport ${t.name}`);
    if (price) {
      pushLine({
        price,
        kind: "transport",
        label: t.name,
        ctx: { travellers, nights, days, rooms, vehicles },
      });
    }
  }

  // --- Activities / meals / add-ons --------------------------------------
  const ctxBase = { travellers, nights, days, rooms, vehicles };
  for (const a of input.activities) {
    const price = pickPrice(a.prices, `activity ${a.name}`);
    if (price) pushLine({ price, kind: "activity", label: a.name, ctx: ctxBase });
  }
  for (const m of input.meals) {
    const price = pickPrice(m.prices, `meal ${m.name}`);
    if (price) pushLine({ price, kind: "meal", label: m.name, ctx: ctxBase });
  }
  for (const ad of input.addons) {
    const price = pickPrice(ad.prices, `add-on ${ad.name}`);
    if (price) pushLine({ price, kind: "addon", label: ad.name, ctx: ctxBase });
  }

  return { ok: problems.length === 0, problems, lines, meta, allocation };

  function pushLine(args: {
    price: PriceDTO;
    kind: ResolvedLineMeta["kind"];
    label: string;
    ctx: QtyContext;
  }) {
    const qty = quantityForUnit(args.price.unit, args.ctx);
    if (qty === null) {
      problems.push(`${args.label}: "${humanizeEnum(args.price.unit)}" pricing is not supported yet.`);
      return;
    }
    lines.push({
      sourceId: args.price.id,
      kind: args.kind,
      label: args.label,
      unit: args.price.unit,
      unitPrice: Money.fromMinor(args.price.amountMinor),
      quantity: qty,
      supplierUnitCost:
        args.price.supplierCostMinor != null
          ? Money.fromMinor(args.price.supplierCostMinor)
          : undefined,
    });
    meta.push({
      kind: args.kind,
      label: args.label,
      unit: args.price.unit,
      quantity: qty,
      sourceId: args.price.id,
      allocationNote: allocationNote(args.price.unit, args.ctx),
      season: args.price.season,
    });
  }
}
