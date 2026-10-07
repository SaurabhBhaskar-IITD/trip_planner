import "server-only";
import { createHash } from "crypto";
import { tripCustomizationRepository } from "@/server/repositories";
import type { CustomizationRowDTO, PublicTripRecord } from "@/server/repositories";
import type { AddonCategory } from "@/domain/shared/enums";
import {
  evaluateCustomization,
  V1_CHARGE_BASES,
  type ChargeBasis,
} from "@/domain/public-catalog/customization";

/**
 * Builds the CUSTOMER-SAFE view of a trip's customizations for trip-le.com.
 *
 * The output contains only what a customer may see. It is constructed field by
 * field (never by spreading a database row), so adding an internal column to the
 * schema later cannot silently widen this public contract.
 *
 * Two contract versions are served so the planner and the website can deploy in
 * either order:
 *   v1 (default) — the original shape, unchanged: per-person / per-booking
 *       options only, no categories, no price-on-request. A website that has not
 *       been upgraded keeps working exactly as before.
 *   v2 (`?v=2`) — hotel/travel upgrades only (uncategorised add-ons such as
 *       activities are not part of the customer customization flow), every
 *       sellable pricing basis, price-on-request options, and the trip context
 *       (nights, base room occupancy) needed to multiply them.
 */

export type PublicApiVersion = 1 | 2;

/** v1 option — the original contract. Do not change. */
export interface PublicOptionV1DTO {
  /** Stable option id the website submits back when booking. */
  id: string;
  name: string;
  description: string | null;
  /** Selling price per charge unit, in paise. */
  priceMinor: number;
  currency: "INR";
  chargeBasis: "per_person" | "per_booking";
  /** Mutually-exclusive set (customer picks at most one), e.g. "sharing". */
  group: string | null;
  isDefault: boolean;
  sortOrder: number;
}

/** v2 option. */
export interface PublicOptionV2DTO {
  id: string;
  name: string;
  description: string | null;
  category: AddonCategory;
  /** Paise per charge unit; null when the price is on request. */
  priceMinor: number | null;
  priceOnRequest: boolean;
  currency: "INR";
  /** Null when the price is on request. */
  chargeBasis: ChargeBasis | null;
  group: string | null;
  isDefault: boolean;
  isRecommended: boolean;
  /** Customer-facing availability / seasonality note. */
  availabilityNote: string | null;
  /** Travellers per room when this option is chosen (room-sharing options). */
  roomOccupancy: number | null;
  sortOrder: number;
}

interface PublicTripDTO {
  slug: string;
  name: string;
  durationDays: number | null;
  durationNights: number | null;
}

export interface PublicTripOptionsV1DTO {
  trip: PublicTripDTO;
  options: PublicOptionV1DTO[];
  /**
   * Fingerprint of the sellable configuration. Changes whenever an option is
   * (de)activated or re-priced, so a booking can record exactly which
   * configuration it was priced against.
   */
  configVersion: string;
}

export interface PublicTripOptionsV2DTO {
  trip: PublicTripDTO & { baseRoomOccupancy: number | null };
  options: PublicOptionV2DTO[];
  configVersion: string;
}

/** @deprecated name kept for existing imports — the v1 shape. */
export type PublicTripOptionsDTO = PublicTripOptionsV1DTO;
export type PublicOptionDTO = PublicOptionV1DTO;

export type PublicTripOptionsResult<T = PublicTripOptionsV1DTO | PublicTripOptionsV2DTO> =
  | { status: "ok"; data: T }
  | { status: "unpublished" }
  | { status: "not_found" };

function verdictFor(row: CustomizationRowDTO, trip: PublicTripRecord) {
  return evaluateCustomization({
    active: row.active,
    masterActive: row.masterActive,
    priceOverrideMinor: row.priceOverrideMinor,
    priceOverrideUnit: row.priceOverrideUnit,
    masterPrices: row.masterPrices,
    priceOnRequest: row.priceOnRequest,
    nights: trip.durationNights,
    baseRoomOccupancy: trip.baseRoomOccupancy,
    roomOccupancy: row.roomOccupancy,
  });
}

function toV1Option(row: CustomizationRowDTO, trip: PublicTripRecord): PublicOptionV1DTO | null {
  const s = verdictFor(row, trip);
  // Fail closed: unpriceable, on-request and bases v1 can't express are withheld.
  if (!s.sellable || s.onRequest || !V1_CHARGE_BASES.has(s.chargeBasis)) return null;
  return {
    id: row.addonId,
    name: row.name,
    description: row.descriptionOverride ?? row.masterDescription,
    priceMinor: s.priceMinor,
    currency: "INR",
    chargeBasis: s.chargeBasis as "per_person" | "per_booking",
    group: row.exclusiveGroup,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

function toV2Option(row: CustomizationRowDTO, trip: PublicTripRecord): PublicOptionV2DTO | null {
  // Only hotel/travel upgrades belong to the customer customization flow.
  if (!row.category) return null;
  const s = verdictFor(row, trip);
  if (!s.sellable) return null;
  return {
    id: row.addonId,
    name: row.name,
    description: row.descriptionOverride ?? row.masterDescription,
    category: row.category,
    priceMinor: s.onRequest ? null : s.priceMinor,
    priceOnRequest: s.onRequest,
    currency: "INR",
    chargeBasis: s.onRequest ? null : s.chargeBasis,
    group: row.exclusiveGroup,
    // An on-request option can never be pre-selected: it isn't purchasable.
    isDefault: s.onRequest ? false : row.isDefault,
    isRecommended: row.isRecommended,
    availabilityNote: row.availabilityNote,
    roomOccupancy: row.roomOccupancy,
    sortOrder: row.sortOrder,
  };
}

function fingerprint(canonical: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

function tripDTO(trip: PublicTripRecord): PublicTripDTO {
  return {
    slug: trip.slug,
    name: trip.name,
    durationDays: trip.durationDays,
    durationNights: trip.durationNights,
  };
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
export async function getPublicTripOptions(slug: string): Promise<PublicTripOptionsResult<PublicTripOptionsV1DTO>>;
export async function getPublicTripOptions(
  slug: string,
  version: 1,
): Promise<PublicTripOptionsResult<PublicTripOptionsV1DTO>>;
export async function getPublicTripOptions(
  slug: string,
  version: 2,
): Promise<PublicTripOptionsResult<PublicTripOptionsV2DTO>>;
export async function getPublicTripOptions(
  slug: string,
  version: PublicApiVersion = 1,
): Promise<PublicTripOptionsResult> {
  const trip = await tripCustomizationRepository.findPublicBySlug(slug);
  if (!trip) return { status: "not_found" };
  if (!trip.publicOptionsEnabled) return { status: "not_found" };
  if (trip.status !== "active") return { status: "unpublished" };

  if (version === 2) {
    const options = trip.customizations
      .map((r) => toV2Option(r, trip))
      .filter((o): o is PublicOptionV2DTO => o !== null);
    return {
      status: "ok",
      data: {
        trip: { ...tripDTO(trip), baseRoomOccupancy: trip.baseRoomOccupancy },
        options,
        configVersion: fingerprint([
          trip.durationNights,
          trip.baseRoomOccupancy,
          options.map((o) => [o.id, o.priceMinor, o.priceOnRequest, o.chargeBasis, o.group, o.isDefault, o.roomOccupancy]),
        ]),
      },
    };
  }

  const options = trip.customizations
    .map((r) => toV1Option(r, trip))
    .filter((o): o is PublicOptionV1DTO => o !== null);
  return {
    status: "ok",
    data: {
      trip: tripDTO(trip),
      options,
      // Unchanged v1 fingerprint, so existing bookings' configVersion stays comparable.
      configVersion: fingerprint(options.map((o) => [o.id, o.priceMinor, o.chargeBasis, o.group, o.isDefault])),
    },
  };
}
