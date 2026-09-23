import "server-only";
import { createHash } from "crypto";
import { tripCustomizationRepository } from "@/server/repositories";
import type { CustomizationRowDTO } from "@/server/repositories";
import { evaluateCustomization, type ChargeBasis } from "@/domain/public-catalog/customization";

/**
 * Builds the CUSTOMER-SAFE view of a trip's customizations for trip-le.com.
 *
 * The output contains only what a customer may see. It is constructed field by
 * field (never by spreading a database row), so adding an internal column to the
 * schema later cannot silently widen this public contract.
 */

export interface PublicOptionDTO {
  /** Stable option id the website submits back when booking. */
  id: string;
  name: string;
  description: string | null;
  /** Selling price per charge unit, in paise. */
  priceMinor: number;
  currency: "INR";
  chargeBasis: ChargeBasis;
  /** Mutually-exclusive set (customer picks at most one), e.g. "sharing". */
  group: string | null;
  isDefault: boolean;
  sortOrder: number;
}

export interface PublicTripOptionsDTO {
  trip: { slug: string; name: string; durationDays: number | null; durationNights: number | null };
  options: PublicOptionDTO[];
  /**
   * Fingerprint of the sellable configuration. Changes whenever an option is
   * (de)activated or re-priced, so a booking can record exactly which
   * configuration it was priced against.
   */
  configVersion: string;
}

export type PublicTripOptionsResult =
  | { status: "ok"; data: PublicTripOptionsDTO }
  | { status: "unpublished" }
  | { status: "not_found" };

function toPublicOption(row: CustomizationRowDTO): PublicOptionDTO | null {
  const s = evaluateCustomization({
    active: row.active,
    masterActive: row.masterActive,
    priceOverrideMinor: row.priceOverrideMinor,
    priceOverrideUnit: row.priceOverrideUnit,
    masterPrices: row.masterPrices,
  });
  if (!s.sellable) return null; // fail closed: unpriceable options are never offered
  return {
    id: row.addonId,
    name: row.name,
    description: row.descriptionOverride ?? row.masterDescription,
    priceMinor: s.priceMinor,
    currency: "INR",
    chargeBasis: s.chargeBasis,
    group: row.exclusiveGroup,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

function fingerprint(options: PublicOptionDTO[]): string {
  const canonical = options.map((o) => [o.id, o.priceMinor, o.chargeBasis, o.group, o.isDefault]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

/**
 * A trip is served publicly only when the planner OWNS its public options
 * (`publicOptionsEnabled`) AND it is published (`active`).
 *
 * A trip the planner does not own is reported as `not_found` — deliberately
 * indistinguishable from an unknown slug — so trip-le.com keeps whatever it
 * already does for that tour. That is what lets the whole public catalogue be
 * imported here without changing anything for customers, and lets trips be
 * switched over one at a time.
 */
export async function getPublicTripOptions(slug: string): Promise<PublicTripOptionsResult> {
  const trip = await tripCustomizationRepository.findPublicBySlug(slug);
  if (!trip) return { status: "not_found" };
  if (!trip.publicOptionsEnabled) return { status: "not_found" };
  if (trip.status !== "active") return { status: "unpublished" };

  const options = trip.customizations
    .map(toPublicOption)
    .filter((o): o is PublicOptionDTO => o !== null);

  return {
    status: "ok",
    data: {
      trip: {
        slug: trip.slug,
        name: trip.name,
        durationDays: trip.durationDays,
        durationNights: trip.durationNights,
      },
      options,
      configVersion: fingerprint(options),
    },
  };
}
