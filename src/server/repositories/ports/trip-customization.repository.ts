import type { AddonCategory, PricingUnit, TripStatus } from "@/domain/shared/enums";
import type { PriceDTO } from "@/types/master-data";

/**
 * Trip customizations = a trip's add-ons as SOLD ON THE PUBLIC WEBSITE.
 *
 * Built on the existing TripAddonOption join (master Addon is never duplicated).
 * Prices exposed here are customer-facing only: supplier cost and internal notes
 * are never selected by the public read — they have their own admin-only read.
 */

/** One configured customization (active or not), for admin management + public reads. */
export interface CustomizationRowDTO {
  addonId: string;
  name: string;
  masterDescription: string | null;
  descriptionOverride: string | null;
  /** HOTEL_UPGRADE / TRAVEL_UPGRADE; null = uncategorised (not offered to customers). */
  category: AddonCategory | null;
  masterActive: boolean;
  active: boolean;
  sortOrder: number;
  isDefault: boolean;
  isRecommended: boolean;
  priceOnRequest: boolean;
  availabilityNote: string | null;
  roomOccupancy: number | null;
  exclusiveGroup: string | null;
  priceOverrideMinor: number | null;
  priceOverrideUnit: PricingUnit | null;
  /** Customer-facing master prices (no supplier cost). */
  masterPrices: PriceDTO[];
  updatedAt: Date;
  updatedById: string | null;
}

/** ADMIN-ONLY economics and notes for one customization. Never public. */
export interface CustomizationInternalDTO {
  addonId: string;
  note: string | null;
  supplierCostOverrideMinor: number | null;
}

export interface CustomizationPatch {
  sortOrder?: number;
  isDefault?: boolean;
  isRecommended?: boolean;
  priceOnRequest?: boolean;
  availabilityNote?: string | null;
  roomOccupancy?: number | null;
  exclusiveGroup?: string | null;
  descriptionOverride?: string | null;
  /** INTERNAL. */
  note?: string | null;
  /** `null` clears the override (falls back to the catalogue price). */
  priceOverride?: { amountMinor: number; unit: PricingUnit } | null;
  /** INTERNAL supplier cost for the override price; `null` clears it. */
  supplierCostOverrideMinor?: number | null;
}

export interface PublicTripRecord {
  id: string;
  slug: string;
  name: string;
  durationDays: number | null;
  durationNights: number | null;
  baseRoomOccupancy: number | null;
  status: TripStatus;
  /** Does the planner own this trip's public customizations? (See Trip model.) */
  publicOptionsEnabled: boolean;
  /** ACTIVE customizations only, ordered. */
  customizations: CustomizationRowDTO[];
}

export interface TripCustomizationRepository {
  /** Every add-on configured for the trip (active or not), ordered. */
  listForTrip(tripId: string): Promise<CustomizationRowDTO[]>;
  /** ADMIN-ONLY: notes + supplier costs for the trip's customizations. */
  listInternalForTrip(tripId: string): Promise<CustomizationInternalDTO[]>;
  /** Attach a catalogue add-on to the trip, INACTIVE (price it, then activate). */
  attach(tripId: string, addonId: string, userId: string | null): Promise<void>;
  setActive(tripId: string, addonId: string, active: boolean, userId: string | null): Promise<void>;
  update(tripId: string, addonId: string, patch: CustomizationPatch, userId: string | null): Promise<void>;
  /** Public read: trip + its ACTIVE customizations, by slug. */
  findPublicBySlug(slug: string): Promise<PublicTripRecord | null>;
  /** Trip-specific price overrides keyed by addonId (keeps internal quotes consistent). */
  priceOverrides(tripId: string): Promise<Map<string, { amountMinor: number; unit: PricingUnit }>>;
}
