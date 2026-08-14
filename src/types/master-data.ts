import type {
  AccommodationCategory,
  ActivityType,
  MealPlan,
  MealType,
  PricingUnit,
  RoomType,
  Season,
  SegmentType,
  TransportMode,
  TripStatus,
} from "@/domain/shared/enums";

/**
 * Master-data view models (DTOs).
 *
 * These are the plain, serialisable shapes that repositories return and server
 * components/actions pass to client components. They are mapped from Prisma rows
 * in the infrastructure layer, with two rules enforced at the boundary:
 *   1. Monetary values are exposed as `number` MINOR UNITS (BigInt is converted;
 *      BigInt is not serialisable across the RSC boundary).
 *   2. Internal fields (supplierCost) are only populated when the caller holds
 *      `pricing:viewInternal` — otherwise omitted entirely.
 *
 * These DTOs are read models for the CRUD UI; they are intentionally separate
 * from the pure domain aggregate types (which serve the future pricing engine).
 */

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

// --- Destinations --------------------------------------------------------
export interface DestinationDTO {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  country: string;
  description: string | null;
  active: boolean;
  tripCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Lightweight option for select controls. */
export interface DestinationOption {
  id: string;
  name: string;
  slug: string;
}

// --- Trips ---------------------------------------------------------------
export interface TripListItemDTO {
  id: string;
  name: string;
  slug: string;
  status: TripStatus;
  version: number;
  durationDays: number;
  durationNights: number;
  destinationNames: string[];
  updatedAt: Date;
}

export interface TripDestinationDTO {
  destinationId: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface ItinerarySegmentDTO {
  id: string;
  sortOrder: number;
  type: SegmentType;
  title: string;
  detail: string | null;
  transportMode: TransportMode | null;
  mealType: MealType | null;
}

export interface ItineraryDayDTO {
  id: string;
  dayNumber: number;
  title: string;
  summary: string | null;
  fromDestinationId: string | null;
  toDestinationId: string | null;
  fromName: string | null;
  toName: string | null;
  segments: ItinerarySegmentDTO[];
}

export interface TripDetailDTO {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  description: string | null;
  durationDays: number;
  durationNights: number;
  status: TripStatus;
  version: number;
  destinations: TripDestinationDTO[];
  itinerary: ItineraryDayDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Shared pricing view model (used by later modules) -------------------
export interface PriceDTO {
  id: string;
  amountMinor: number;
  currency: string;
  unit: PricingUnit;
  season: Season | null;
  validFrom: Date | null;
  validUntil: Date | null;
  minPax: number | null;
  maxPax: number | null;
  active: boolean;
  /** INTERNAL — present only when the caller holds pricing:viewInternal. */
  supplierCostMinor?: number | null;
}

// Re-export enum unions commonly needed by UI props.
export type {
  AccommodationCategory,
  ActivityType,
  MealPlan,
  MealType,
  PricingUnit,
  RoomType,
  Season,
  SegmentType,
  TransportMode,
  TripStatus,
};
