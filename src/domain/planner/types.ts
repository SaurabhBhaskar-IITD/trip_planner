import type { ComponentKind, PricingUnit, RoomType, Season } from "@/domain/shared/enums";
import type { ResolvedLineInput } from "@/domain/pricing/types";
import type {
  AccommodationDetailDTO,
  ActivityDetailDTO,
  AddonDetailDTO,
  MealDetailDTO,
  TransportationDetailDTO,
} from "@/types/master-data";

export const PLANNER_VERSION = "1.0.0-mvp";

/** Occupancy preference is exactly the RoomOccupancy enum (single…six_sharing). */
export type Occupancy = RoomType;

/**
 * Structured planner input. This is the ONLY shape the pricing path accepts —
 * designed so a future natural-language parser (§34) can produce it without any
 * change to the engine.
 */
export interface PlannerRequest {
  /** Present when adding a new VERSION to an existing quote (§30). */
  quoteId?: string;
  customer: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
  };
  tripId: string;
  travellerCount: number;
  /** Optional ISO date. When omitted the quote is a date-independent snapshot (§36). */
  travelStartDate?: string;
  accommodation?: {
    accommodationId: string;
    occupancy: Occupancy;
  };
  transportId?: string;
  activityIds: string[];
  mealIds: string[];
  addonIds: string[];
  note?: string;
}

/** All master data the resolver needs, pre-fetched (DTOs only — no Prisma here). */
export interface ResolveInput {
  durationDays: number;
  durationNights: number;
  travellerCount: number;
  travelDate?: Date;
  accommodation?: AccommodationDetailDTO | null;
  occupancy?: Occupancy;
  transport?: TransportationDetailDTO | null;
  activities: ActivityDetailDTO[];
  meals: MealDetailDTO[];
  addons: AddonDetailDTO[];
}

export interface AllocationInfo {
  nights: number;
  days: number;
  travellerCount: number;
  occupancy?: Occupancy;
  rooms?: number;
  roomTypeName?: string;
  vehicleName?: string;
  vehicleCapacity?: number;
  vehicles?: number;
}

/** Per-line display/snapshot metadata, parallel to the engine's priced lines. */
export interface ResolvedLineMeta {
  kind: ComponentKind;
  label: string;
  unit: PricingUnit;
  quantity: number;
  sourceId?: string;
  allocationNote: string;
  season: Season | null;
}

export interface ResolveResult {
  ok: boolean;
  /** Blocking problems (§35). When non-empty, no quote may be generated. */
  problems: string[];
  lines: ResolvedLineInput[];
  meta: ResolvedLineMeta[];
  allocation: AllocationInfo;
}

// --- Itinerary document (frozen snapshot) --------------------------------
export interface PlannerItineraryDay {
  dayNumber: number;
  title: string;
  route?: string;
  description: string;
  accommodation?: string;
  meals?: string;
  transport?: string;
}

export interface PlannerItineraryDoc {
  generatorVersion: string;
  tripName: string;
  durationDays: number;
  durationNights: number;
  travellerCount: number;
  preparedFor: string;
  accommodationSummary?: string;
  transportSummary?: string;
  days: PlannerItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  notes: string[];
}
