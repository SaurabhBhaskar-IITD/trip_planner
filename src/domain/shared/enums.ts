/**
 * Canonical domain enumerations.
 *
 * These are the vocabulary of the business. They live in the pure domain layer
 * (no framework imports) so the same definitions are shared by the engine, the
 * Prisma schema/enums, the Zod validators and the UI. NEVER hard-code these lists
 * inside a React component — import from here.
 */

// --- Accommodation -------------------------------------------------------
export const ROOM_TYPES = ["single", "double", "triple", "quad", "six_sharing"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

/** Sleeping capacity per room type — used by deterministic room math. */
export const ROOM_TYPE_CAPACITY: Record<RoomType, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
  six_sharing: 6,
};

export const ACCOMMODATION_CATEGORIES = ["standard", "deluxe", "premium", "suite"] as const;
export type AccommodationCategory = (typeof ACCOMMODATION_CATEGORIES)[number];

// --- Transportation ------------------------------------------------------
export const TRANSPORT_MODES = [
  "flight",
  "train",
  "private_sedan",
  "suv",
  "tempo_traveller",
  "bus",
  "shared_taxi",
  "local_transport",
  "airport_transfer",
  "railway_transfer",
] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

// --- Activities ----------------------------------------------------------
export const ACTIVITY_TYPES = [
  "sightseeing",
  "adventure",
  "entry_ticket",
  "local_experience",
  "guide",
  "excursion",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// --- Meals ---------------------------------------------------------------
export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Standard hospitality meal plans. */
export const MEAL_PLANS = ["EP", "CP", "MAP", "AP", "custom"] as const;
export type MealPlan = (typeof MEAL_PLANS)[number];

// --- Pricing -------------------------------------------------------------
/** How a price is multiplied out. Drives the deterministic pricing engine. */
export const PRICING_UNITS = [
  "per_person",
  "per_room",
  "per_night",
  "per_room_per_night",
  "per_person_per_night",
  "per_vehicle",
  "per_day",
  "per_group",
  "fixed",
  "percentage",
] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

/** Category tag on each price line, used to group the internal breakdown. */
export const COMPONENT_KINDS = [
  "accommodation",
  "transport",
  "activity",
  "meal",
  "transfer",
  "addon",
  "custom",
  "discount",
  "tax",
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const MARKUP_TYPES = ["percentage", "fixed_per_unit", "fixed_total"] as const;
export type MarkupType = (typeof MARKUP_TYPES)[number];

// --- Quotes --------------------------------------------------------------
export const QUOTE_STATUSES = [
  "draft",
  "sent",
  "awaiting_response",
  "confirmed",
  "cancelled",
  "expired",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

// --- Seasons -------------------------------------------------------------
export const SEASONS = ["peak", "shoulder", "off_peak", "all"] as const;
export type Season = (typeof SEASONS)[number];

// --- Trips ---------------------------------------------------------------
export const TRIP_STATUSES = ["draft", "active", "archived"] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

// --- Itinerary -----------------------------------------------------------
/** Kinds of ordered segment within an itinerary day. */
export const SEGMENT_TYPES = [
  "transfer",
  "accommodation",
  "meal",
  "activity",
  "sightseeing",
  "free_time",
  "note",
] as const;
export type SegmentType = (typeof SEGMENT_TYPES)[number];

// --- Human labels (presentation only; safe on client) --------------------
/** Turn an enum value like "six_sharing" / "per_room_per_night" into "Six sharing". */
export function humanizeEnum(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
