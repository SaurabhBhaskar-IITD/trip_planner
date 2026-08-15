import type {
  AccommodationDetailDTO,
  ActivityDetailDTO,
  AddonDetailDTO,
  MealDetailDTO,
  TransportationDetailDTO,
} from "@/types/master-data";
import type { PriceReadOptions } from "./catalogue.repositories";

/** The five catalogue kinds a trip can offer. */
export type TripOptionKind = "accommodation" | "transportation" | "activity" | "meal" | "addon";

/** A master record shown as a toggle in trip-option management (enabled or not). */
export interface OptionCandidateDTO {
  id: string;
  name: string;
  subtitle?: string;
  masterActive: boolean;
  enabled: boolean;
  sortOrder: number;
  isDefault: boolean;
}

/**
 * Trip-specific available options. A trip explicitly declares which reusable
 * master records it offers; the planner reads ONLY these (never every record in a
 * destination). Master data is never duplicated — these are join rows.
 */
export interface TripOptionRepository {
  // --- Planner reads: enabled option detail (with prices), ordered ----------
  listAccommodationOptions(tripId: string, opts: PriceReadOptions): Promise<AccommodationDetailDTO[]>;
  listTransportOptions(tripId: string, opts: PriceReadOptions): Promise<TransportationDetailDTO[]>;
  listActivityOptions(tripId: string, opts: PriceReadOptions): Promise<ActivityDetailDTO[]>;
  listMealOptions(tripId: string, opts: PriceReadOptions): Promise<MealDetailDTO[]>;
  listAddonOptions(tripId: string, opts: PriceReadOptions): Promise<AddonDetailDTO[]>;

  // --- Validation: is a master record an ACTIVE option of this trip? ---------
  enabledIds(tripId: string, kind: TripOptionKind): Promise<Set<string>>;

  // --- Trip-option management (admin UI) ------------------------------------
  listCandidates(tripId: string, kind: TripOptionKind): Promise<OptionCandidateDTO[]>;
  setEnabled(tripId: string, kind: TripOptionKind, masterId: string, enabled: boolean): Promise<void>;
}
