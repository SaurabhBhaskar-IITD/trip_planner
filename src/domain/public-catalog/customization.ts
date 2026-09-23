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
 * Only units the public checkout can compute without room/vehicle allocation are
 * sellable. `per_room`, `per_vehicle`, `per_night`, `percentage`… depend on
 * allocation or on data the website does not collect, so they are withheld with
 * an explicit reason the admin can see.
 */

/** How a public customization is multiplied at checkout. */
export type ChargeBasis = "per_person" | "per_booking";

const SELLABLE_UNITS: Partial<Record<PricingUnit, ChargeBasis>> = {
  per_person: "per_person",
  fixed: "per_booking",
  per_group: "per_booking",
};

export function chargeBasisFor(unit: PricingUnit): ChargeBasis | null {
  return SELLABLE_UNITS[unit] ?? null;
}

export interface CustomizationInput {
  active: boolean;
  masterActive: boolean;
  priceOverrideMinor: number | null;
  priceOverrideUnit: PricingUnit | null;
  masterPrices: PriceDTO[];
}

export type Sellability =
  | { sellable: true; priceMinor: number; unit: PricingUnit; chargeBasis: ChargeBasis; source: "override" | "catalogue" }
  | { sellable: false; reason: string };

export function evaluateCustomization(input: CustomizationInput): Sellability {
  if (!input.masterActive) return { sellable: false, reason: "The master add-on is inactive." };
  if (!input.active) return { sellable: false, reason: "Deactivated for this trip." };

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
      reason: `"${unit.replace(/_/g, " ")}" pricing needs room/vehicle allocation and can't be sold online yet.`,
    };
  }

  return { sellable: true, priceMinor, unit, chargeBasis, source };
}

/** Line total for one sellable customization, in paise (integer arithmetic only). */
export function customizationTotalMinor(
  priceMinor: number,
  chargeBasis: ChargeBasis,
  travellers: number,
): number {
  const pax = Math.max(1, Math.floor(travellers) || 1);
  return chargeBasis === "per_person" ? priceMinor * pax : priceMinor;
}
