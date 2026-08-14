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

// --- Accommodations ------------------------------------------------------
export interface AccommodationListItemDTO {
  id: string;
  name: string;
  destinationId: string;
  destinationName: string;
  category: AccommodationCategory;
  starRating: number | null;
  roomTypeCount: number;
  active: boolean;
  updatedAt: Date;
}

export interface RoomTypeDTO {
  id: string;
  accommodationId: string;
  name: string;
  /** RoomOccupancy enum value (single/double/triple/quad/six_sharing). */
  occupancy: RoomType;
  category: AccommodationCategory;
  maxOccupancy: number | null;
  active: boolean;
  prices: PriceDTO[];
}

export interface AccommodationDetailDTO {
  id: string;
  name: string;
  destinationId: string;
  destinationName: string;
  category: AccommodationCategory;
  starRating: number | null;
  description: string | null;
  amenities: string[];
  active: boolean;
  roomTypes: RoomTypeDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Transportation ------------------------------------------------------
export interface TransportationListItemDTO {
  id: string;
  name: string;
  mode: TransportMode;
  provider: string | null;
  vehicleType: string | null;
  capacity: number;
  routeFrom: string | null;
  routeTo: string | null;
  active: boolean;
  priceCount: number;
  updatedAt: Date;
}

export interface TransportationDetailDTO {
  id: string;
  name: string;
  mode: TransportMode;
  provider: string | null;
  vehicleType: string | null;
  capacity: number;
  routeFrom: string | null;
  routeTo: string | null;
  active: boolean;
  prices: PriceDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Activities ----------------------------------------------------------
export interface ActivityListItemDTO {
  id: string;
  name: string;
  destinationId: string | null;
  destinationName: string | null;
  type: ActivityType;
  durationMinutes: number | null;
  active: boolean;
  priceCount: number;
  updatedAt: Date;
}

export interface ActivityDetailDTO {
  id: string;
  name: string;
  destinationId: string | null;
  destinationName: string | null;
  type: ActivityType;
  description: string | null;
  durationMinutes: number | null;
  active: boolean;
  prices: PriceDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Meals ---------------------------------------------------------------
export interface MealListItemDTO {
  id: string;
  name: string;
  mealType: MealType;
  plan: MealPlan;
  active: boolean;
  priceCount: number;
  updatedAt: Date;
}

export interface MealDetailDTO {
  id: string;
  name: string;
  mealType: MealType;
  plan: MealPlan;
  active: boolean;
  prices: PriceDTO[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Add-ons -------------------------------------------------------------
export interface AddonListItemDTO {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  priceCount: number;
  updatedAt: Date;
}

export interface AddonDetailDTO {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: PriceDTO[];
  createdAt: Date;
  updatedAt: Date;
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
