import type { PricingUnit } from "@/domain/shared/enums";
import type { PriceDTO } from "@/types/master-data";
import { resolvePrice } from "@/domain/planner/price-resolver";

/**
 * Decides whether a trip's add-on can be SOLD ONLINE, and at what price.
 *
 * This is the single gate between planner configuration and the public booking
 * website. It is pure (no I/O) so it can be unit-tested exhaustively, and it
 * fails CLOSED: anything that cannot be priced unambiguously is withheld from
 * customers rather than guessed.
 *
 * Price precedence:
 *   1. A trip-specific override (priceOverrideMinor + priceOverrideUnit) wins.
 *   2. Otherwise the master add-on's prices are resolved with the same resolver
 *      the internal planner uses (active-only, ambiguity blocks).
 *
 * Every pricing basis the public checkout can compute from what it knows —
 * travellers, the trip's nights, and the trip's room occupancy — is sellable.
 * Night-based units need the trip's nights; room-based units need a room
 * occupancy (the option's own, else the trip's base). Without that data the
 * option is withheld with a reason the admin can see. `per_vehicle`, `per_day`
 * and `percentage` still need allocation the website does not do.
 *
 * "Price on request" options are offered for ENQUIRY only: no price, never
 * purchasable, never part of a total.
 */

/** How a public customization is multiplied at checkout. */
export type ChargeBasis =
  | "per_person"
  | "per_booking"
  | "per_person_per_night"
  | "per_room"
  | "per_room_per_night"
  | "per_night";

/** The bases the original (v1) public API contract could express. */
export const V1_CHARGE_BASES: ReadonlySet<ChargeBasis> = new Set(["per_person", "per_booking"]);

const SELLABLE_UNITS: Partial<Record<PricingUnit, ChargeBasis>> = {
  per_person: "per_person",
  fixed: "per_booking",
  per_group: "per_booking",
  per_person_per_night: "per_person_per_night",
  per_room: "per_room",
  per_room_per_night: "per_room_per_night",
  per_night: "per_night",
};

const NIGHT_BASES: ReadonlySet<ChargeBasis> = new Set(["per_person_per_night", "per_room_per_night", "per_night"]);
const ROOM_BASES: ReadonlySet<ChargeBasis> = new Set(["per_room", "per_room_per_night"]);

export function chargeBasisFor(unit: PricingUnit): ChargeBasis | null {
  return SELLABLE_UNITS[unit] ?? null;
}

export function isNightBased(basis: ChargeBasis): boolean {
  return NIGHT_BASES.has(basis);
}

export function isRoomBased(basis: ChargeBasis): boolean {
  return ROOM_BASES.has(basis);
}

const positiveInt = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isInteger(n) && n > 0;

export interface CustomizationInput {
  active: boolean;
  masterActive: boolean;
  priceOverrideMinor: number | null;
  priceOverrideUnit: PricingUnit | null;
  masterPrices: PriceDTO[];
  /** Offered for enquiry only (no online price). */
  priceOnRequest?: boolean;
  /** Trip nights — required by night-based units. */
  nights?: number | null;
  /** Trip's base travellers per room — required by room-based units. */
  baseRoomOccupancy?: number | null;
  /** This option's own travellers per room (e.g. Double Sharing = 2). */
  roomOccupancy?: number | null;
}

export type Sellability =
  | {
      sellable: true;
      onRequest: false;
      priceMinor: number;
      unit: PricingUnit;
      chargeBasis: ChargeBasis;
      source: "override" | "catalogue";
    }
  | { sellable: true; onRequest: true }
  | { sellable: false; reason: string };

export function evaluateCustomization(input: CustomizationInput): Sellability {
  if (!input.masterActive) return { sellable: false, reason: "The master add-on is inactive." };
  if (!input.active) return { sellable: false, reason: "Deactivated for this trip." };
  if (input.priceOnRequest) return { sellable: true, onRequest: true };

  let priceMinor: number;
  let unit: PricingUnit;
  let source: "override" | "catalogue";

  const hasAmount = input.priceOverrideMinor != null;
  const hasUnit = input.priceOverrideUnit != null;
  if (hasAmount !== hasUnit) {
    return { sellable: false, reason: "Trip price override is incomplete (needs both amount and unit)." };
  }

  if (hasAmount && hasUnit) {
    priceMinor = input.priceOverrideMinor!;
    unit = input.priceOverrideUnit!;
    source = "override";
  } else {
    const r = resolvePrice(input.masterPrices);
    if (r.status === "none") return { sellable: false, reason: "No active price is configured." };
    if (r.status === "ambiguous")
      return { sellable: false, reason: `${r.count} active prices match — pricing is ambiguous.` };
    priceMinor = r.price.amountMinor;
    unit = r.price.unit;
    source = "catalogue";
  }

  if (!Number.isInteger(priceMinor) || priceMinor < 0) {
    return { sellable: false, reason: "Price must be a whole, non-negative amount." };
  }

  const chargeBasis = chargeBasisFor(unit);
  if (!chargeBasis) {
    return {
      sellable: false,
      reason: `"${unit.replace(/_/g, " ")}" pricing needs vehicle/day allocation and can't be sold online yet.`,
    };
  }
  if (isNightBased(chargeBasis) && !positiveInt(input.nights)) {
    return { sellable: false, reason: "Per-night pricing needs the trip's number of nights to be set." };
  }
  if (isRoomBased(chargeBasis) && !positiveInt(input.roomOccupancy ?? input.baseRoomOccupancy)) {
    return { sellable: false, reason: "Per-room pricing needs the trip's base room occupancy to be set." };
  }

  return { sellable: true, onRequest: false, priceMinor, unit, chargeBasis, source };
}

export interface ChargeContext {
  travellers: number;
  /** Trip nights (night-based bases). */
  nights?: number | null;
  /** Travellers per room in effect for this booking (room-based bases). */
  roomOccupancy?: number | null;
}

/**
 * How many charge units a booking buys. Rooms are whole rooms:
 * ceil(travellers / occupancy). Nonsense inputs fall back to 1, never 0.
 */
export function chargeQuantity(basis: ChargeBasis, ctx: ChargeContext): number {
  const pax = Math.max(1, Math.floor(ctx.travellers) || 1);
  const nights = Math.max(1, Math.floor(ctx.nights ?? 1) || 1);
  const occupancy = Math.max(1, Math.floor(ctx.roomOccupancy ?? pax) || 1);
  const rooms = Math.ceil(pax / occupancy);
  switch (basis) {
    case "per_person":
      return pax;
    case "per_booking":
      return 1;
    case "per_person_per_night":
      return pax * nights;
    case "per_room":
      return rooms;
    case "per_room_per_night":
      return rooms * nights;
    case "per_night":
      return nights;
  }
}

/** Line total for one sellable customization, in paise (integer arithmetic only). */
export function customizationTotalMinor(
  priceMinor: number,
  chargeBasis: ChargeBasis,
  travellers: number,
  ctx: Omit<ChargeContext, "travellers"> = {},
): number {
  return priceMinor * chargeQuantity(chargeBasis, { travellers, ...ctx });
}

/** Admin-only margin on a selling price (null when the supplier cost is unknown). */
export function marginMinor(sellingMinor: number | null, supplierCostMinor: number | null): number | null {
  if (sellingMinor == null || supplierCostMinor == null) return null;
  return sellingMinor - supplierCostMinor;
}
