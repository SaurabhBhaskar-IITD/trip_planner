import type {
  DestinationDTO,
  DestinationOption,
  Paginated,
  TripDetailDTO,
  TripListItemDTO,
} from "@/types/master-data";
import type { DestinationInput } from "@/lib/validation/destination.schema";
import type { TripInput } from "@/lib/validation/trip.schema";
import type { ItineraryDayInput, ItinerarySegmentInput } from "@/lib/validation/itinerary.schema";
import type { TripStatus } from "@/domain/shared/enums";
import type { ListQuery } from "../query";

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
