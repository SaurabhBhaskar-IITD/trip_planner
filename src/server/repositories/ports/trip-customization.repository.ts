import type { PricingUnit, TripStatus } from "@/domain/shared/enums";
import type { PriceDTO } from "@/types/master-data";

/**
 * Trip customizations = a trip's add-ons as SOLD ON THE PUBLIC WEBSITE.
 *
 * Built on the existing TripAddonOption join (master Addon is never duplicated).
 * Prices exposed here are customer-facing only: supplier cost is never selected.
 */

/** One configured customization (active or not), for admin management + public reads. */
export interface CustomizationRowDTO {
  addonId: string;
  name: string;
  masterDescription: string | null;
  descriptionOverride: string | null;
  masterActive: boolean;
  active: boolean;
  sortOrder: number;
  isDefault: boolean;
  exclusiveGroup: string | null;
  priceOverrideMinor: number | null;
  priceOverrideUnit: PricingUnit | null;
  /** Customer-facing master prices (no supplier cost). */
  masterPrices: PriceDTO[];
  updatedAt: Date;
  updatedById: string | null;
}

export interface CustomizationPatch {
  sortOrder?: number;
  isDefault?: boolean;
  exclusiveGroup?: string | null;
  descriptionOverride?: string | null;
  /** `null` clears the override (falls back to the catalogue price). */
  priceOverride?: { amountMinor: number; unit: PricingUnit } | null;
}

export interface PublicTripRecord {
  id: string;
  slug: string;
  name: string;
  durationDays: number | null;
  durationNights: number | null;
  status: TripStatus;
  /** Does the planner own this trip's public customizations? (See Trip model.) */
  publicOptionsEnabled: boolean;
  /** ACTIVE customizations only, ordered. */
  customizations: CustomizationRowDTO[];
}

export interface TripCustomizationRepository {
  /** Every add-on configured for the trip (active or not), ordered. */
  listForTrip(tripId: string): Promise<CustomizationRowDTO[]>;
  /** Attach a catalogue add-on to the trip, INACTIVE (price it, then activate). */
  attach(tripId: string, addonId: string, userId: string | null): Promise<void>;
  setActive(tripId: string, addonId: string, active: boolean, userId: string | null): Promise<void>;
  update(tripId: string, addonId: string, patch: CustomizationPatch, userId: string | null): Promise<void>;
  /** Public read: trip + its ACTIVE customizations, by slug. */
  findPublicBySlug(slug: string): Promise<PublicTripRecord | null>;
  /** Trip-specific price overrides keyed by addonId (keeps internal quotes consistent). */
  priceOverrides(tripId: string): Promise<Map<string, { amountMinor: number; unit: PricingUnit }>>;
}
