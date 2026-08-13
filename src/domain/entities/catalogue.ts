import type {
  AccommodationCategory,
  ActivityType,
  MealPlan,
  MealType,
  RoomType,
  TransportMode,
} from "@/domain/shared/enums";
import type { AuditInfo, EntityId, GeoRef, PriceSpec } from "./common";

/**
 * Catalogue (master data) domain types.
 *
 * These describe reusable Trip Le products. They are the SOURCE of prices, but
 * are never referenced live by a quote — a quote stores a snapshot instead (see
 * quote.ts) so historical quotes are immune to later master-data edits.
 */

export interface Destination {
  id: EntityId;
  name: string;
  region?: string;
  country: string;
  description?: string;
  active: boolean;
  audit: AuditInfo;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  from?: GeoRef;
  to?: GeoRef;
  summary?: string;
  /** Structured facts the itinerary engine renders. No prose invented here. */
  activityIds: EntityId[];
  includedMeals: MealType[];
  transportModes: TransportMode[];
  notes?: string;
}

export interface Trip {
  id: EntityId;
  code: string;
  name: string;
  summary?: string;
  destinationIds: EntityId[];
  durationDays: number;
  durationNights: number;
  itinerary: ItineraryDay[];
  defaultInclusions: string[];
  defaultExclusions: string[];
  active: boolean;
  audit: AuditInfo;
}

export interface AccommodationRoomOption {
  roomType: RoomType;
  category: AccommodationCategory;
  price: PriceSpec; // typically per_room_per_night
}

export interface Accommodation {
  id: EntityId;
  name: string;
  location: GeoRef;
  category: AccommodationCategory;
  starRating?: number;
  roomOptions: AccommodationRoomOption[];
  mealPlansOffered: MealPlan[];
  amenities: string[];
  active: boolean;
  audit: AuditInfo;
}

export interface Transportation {
  id: EntityId;
  name: string;
  mode: TransportMode;
  /** Seats/berths available — enforced by deterministic capacity math. */
  capacity: number;
  route?: { from: GeoRef; to: GeoRef };
  price: PriceSpec; // e.g. per_vehicle or per_person
  active: boolean;
  audit: AuditInfo;
}

export interface Activity {
  id: EntityId;
  name: string;
  type: ActivityType;
  location?: GeoRef;
  durationMinutes?: number;
  price: PriceSpec; // e.g. per_person
  active: boolean;
  audit: AuditInfo;
}

export interface Meal {
  id: EntityId;
  name: string;
  mealType: MealType;
  plan: MealPlan;
  price: PriceSpec; // e.g. per_person_per_night
  active: boolean;
  audit: AuditInfo;
}

export interface Addon {
  id: EntityId;
  name: string;
  description?: string;
  price: PriceSpec;
  active: boolean;
  audit: AuditInfo;
}
