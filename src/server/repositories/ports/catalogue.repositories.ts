import type {
  AccommodationDetailDTO,
  AccommodationListItemDTO,
  ActivityDetailDTO,
  ActivityListItemDTO,
  AddonDetailDTO,
  AddonListItemDTO,
  DestinationDTO,
  DestinationOption,
  MealDetailDTO,
  MealListItemDTO,
  Paginated,
  TransportationDetailDTO,
  TransportationListItemDTO,
  TripDetailDTO,
  TripListItemDTO,
} from "@/types/master-data";
import type { DestinationInput } from "@/lib/validation/destination.schema";
import type { TripInput } from "@/lib/validation/trip.schema";
import type { ItineraryDayInput, ItinerarySegmentInput } from "@/lib/validation/itinerary.schema";
import type {
  AccommodationInput,
  RoomTypeInput,
} from "@/lib/validation/accommodation.schema";
import type { TransportationInput } from "@/lib/validation/transportation.schema";
import type { ActivityInput } from "@/lib/validation/activity.schema";
import type { MealInput } from "@/lib/validation/meal.schema";
import type { AddonInput } from "@/lib/validation/addon.schema";
import type { PriceWriteInput } from "@/lib/validation/pricing.schema";
import type { PriceValidityWindow } from "@/domain/pricing/validity";
import type { PriceParentKind, TripStatus } from "@/domain/shared/enums";
import type { ListQuery } from "../query";

/** Whether a caller may see INTERNAL commercial fields (supplier cost). */
export interface PriceReadOptions {
  includeInternal: boolean;
}

/**
 * Catalogue repository PORTS (contracts). The application layer depends on these
 * interfaces; concrete Prisma implementations live in ../prisma. Repositories
 * return DTOs (plain, serialisable) — never Prisma models — so nothing above the
 * infrastructure layer is coupled to the ORM.
 */

export interface DestinationRepository {
  list(query: ListQuery): Promise<Paginated<DestinationDTO>>;
  listOptions(): Promise<DestinationOption[]>;
  findById(id: string): Promise<DestinationDTO | null>;
  slugExists(slug: string, exceptId?: string): Promise<boolean>;
  create(input: DestinationInput & { slug: string }): Promise<DestinationDTO>;
  update(id: string, input: DestinationInput & { slug: string }): Promise<DestinationDTO>;
  setActive(id: string, active: boolean): Promise<void>;
}

export interface TripRepository {
  list(query: ListQuery): Promise<Paginated<TripListItemDTO>>;
  findDetail(id: string): Promise<TripDetailDTO | null>;
  slugExists(slug: string, exceptId?: string): Promise<boolean>;
  create(input: TripInput & { slug: string }): Promise<{ id: string }>;
  update(id: string, input: TripInput & { slug: string }): Promise<void>;
  setStatus(id: string, status: TripStatus): Promise<void>;
  duplicate(id: string, newSlug: string): Promise<{ id: string }>;

  // Itinerary management (ordered days + segments; ordering persisted in DB).
  addDay(tripId: string, input: ItineraryDayInput): Promise<{ id: string }>;
  updateDay(dayId: string, input: ItineraryDayInput): Promise<void>;
  deleteDay(dayId: string): Promise<void>;
  moveDay(tripId: string, dayId: string, direction: "up" | "down"): Promise<void>;

  addSegment(dayId: string, input: ItinerarySegmentInput): Promise<{ id: string }>;
  updateSegment(segmentId: string, input: ItinerarySegmentInput): Promise<void>;
  deleteSegment(segmentId: string): Promise<void>;
  moveSegment(dayId: string, segmentId: string, direction: "up" | "down"): Promise<void>;
}

export interface AccommodationRepository {
  list(query: ListQuery): Promise<Paginated<AccommodationListItemDTO>>;
  findDetail(id: string, opts: PriceReadOptions): Promise<AccommodationDetailDTO | null>;
  create(input: AccommodationInput): Promise<{ id: string }>;
  update(id: string, input: AccommodationInput): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;

  // Room types (belong to an accommodation).
  addRoomType(accommodationId: string, input: RoomTypeInput): Promise<{ id: string }>;
  updateRoomType(roomTypeId: string, input: RoomTypeInput): Promise<void>;
  setRoomTypeActive(roomTypeId: string, active: boolean): Promise<void>;
  deleteRoomType(roomTypeId: string): Promise<void>;
  /** The accommodation a room type belongs to (for revalidation). */
  roomTypeParent(roomTypeId: string): Promise<string | null>;

  /** Active properties in the given destinations — read-only trip integration. */
  listActiveByDestinations(destinationIds: string[]): Promise<AccommodationListItemDTO[]>;
  /** Full detail (room types + prices) for active properties in the destinations — planner. */
  listActiveDetailByDestinations(
    destinationIds: string[],
    opts: PriceReadOptions,
  ): Promise<AccommodationDetailDTO[]>;
}

export interface TransportationRepository {
  list(query: ListQuery): Promise<Paginated<TransportationListItemDTO>>;
  findDetail(id: string, opts: PriceReadOptions): Promise<TransportationDetailDTO | null>;
  create(input: TransportationInput): Promise<{ id: string }>;
  update(id: string, input: TransportationInput): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
  listActiveBrief(): Promise<TransportationListItemDTO[]>;
  listActiveDetail(opts: PriceReadOptions): Promise<TransportationDetailDTO[]>;
}

export interface ActivityRepository {
  list(query: ListQuery): Promise<Paginated<ActivityListItemDTO>>;
  findDetail(id: string, opts: PriceReadOptions): Promise<ActivityDetailDTO | null>;
  create(input: ActivityInput): Promise<{ id: string }>;
  update(id: string, input: ActivityInput): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
  listActiveByDestinations(destinationIds: string[]): Promise<ActivityListItemDTO[]>;
  listActiveDetailByDestinations(
    destinationIds: string[],
    opts: PriceReadOptions,
  ): Promise<ActivityDetailDTO[]>;
}

export interface MealRepository {
  list(query: ListQuery): Promise<Paginated<MealListItemDTO>>;
  findDetail(id: string, opts: PriceReadOptions): Promise<MealDetailDTO | null>;
  create(input: MealInput): Promise<{ id: string }>;
  update(id: string, input: MealInput): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
  listActiveBrief(): Promise<MealListItemDTO[]>;
  listActiveDetail(opts: PriceReadOptions): Promise<MealDetailDTO[]>;
}

export interface AddonRepository {
  list(query: ListQuery): Promise<Paginated<AddonListItemDTO>>;
  findDetail(id: string, opts: PriceReadOptions): Promise<AddonDetailDTO | null>;
  create(input: AddonInput): Promise<{ id: string }>;
  update(id: string, input: AddonInput): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
  listActiveBrief(): Promise<AddonListItemDTO[]>;
  listActiveDetail(opts: PriceReadOptions): Promise<AddonDetailDTO[]>;
}

/**
 * A SINGLE pricing repository serves every module's season-scoped price rows,
 * dispatched by `kind`. This keeps one pricing code path (create/update/activate/
 * delete + conflict detection) instead of five near-identical ones. For
 * accommodation, `parentId` is a RoomType id; for the rest it is the parent id.
 */
export interface PricingRepository {
  /** Sibling price windows for a parent (used for overlap conflict detection). */
  listWindows(kind: PriceParentKind, parentId: string): Promise<PriceValidityWindow[]>;
  /** The parent id a price row belongs to (for update conflict checks + revalidation). */
  getParentId(kind: PriceParentKind, priceId: string): Promise<string | null>;
  create(kind: PriceParentKind, parentId: string, input: PriceWriteInput): Promise<{ id: string }>;
  update(kind: PriceParentKind, priceId: string, input: PriceWriteInput): Promise<void>;
  setActive(kind: PriceParentKind, priceId: string, active: boolean): Promise<void>;
  delete(kind: PriceParentKind, priceId: string): Promise<void>;
}
