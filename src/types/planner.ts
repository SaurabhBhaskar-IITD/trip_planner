import type { ComponentKind, PricingUnit, QuoteStatus, Season } from "@/domain/shared/enums";
import type { AllocationInfo, PlannerItineraryDoc, PlannerRequest } from "@/domain/planner/types";
import type {
  AccommodationDetailDTO,
  ActivityDetailDTO,
  AddonDetailDTO,
  MealDetailDTO,
  TransportationDetailDTO,
  TripDetailDTO,
} from "@/types/master-data";

/** Serialisable view models for the planner UI + quote persistence. */

export interface TripOptionDTO {
  id: string;
  name: string;
  durationDays: number;
  durationNights: number;
}

/** Everything available to configure a quote for a selected trip (no internal $). */
export interface PlannerConfigDTO {
  trip: TripDetailDTO;
  occupancies: string[];
  accommodations: AccommodationDetailDTO[];
  transport: TransportationDetailDTO[];
  activities: ActivityDetailDTO[];
  meals: MealDetailDTO[];
  addons: AddonDetailDTO[];
}

export interface CalcLineDTO {
  kind: ComponentKind;
  label: string;
  /** Soft reference to the master item this line came from (audit only). */
  sourceId?: string;
  unit: PricingUnit;
  quantity: number;
  allocationNote: string;
  season: Season | null;
  unitPriceMinor: number;
  lineTotalMinor: number;
  /** Internal fields present only for callers with pricing:viewInternal. */
  supplierCostMinor?: number;
  marginMinor?: number;
  marginPercentage?: number;
}

export interface PlannerCalculationDTO {
  ok: boolean;
  problems: string[];
  currency: "INR";
  allocation: AllocationInfo;
  lines: CalcLineDTO[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  /** MVP: tax is not configured — surfaced honestly rather than invented (§18). */
  taxConfigured: boolean;
  grandTotalMinor: number;
  internal?: {
    supplierCostTotalMinor: number;
    marginTotalMinor: number;
    marginPercentage: number;
  };
  itinerary: PlannerItineraryDoc;
  engineVersion: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface QuoteItemDTO {
  kind: ComponentKind;
  label: string;
  description: string | null;
  unit: PricingUnit;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  supplierCostMinor?: number | null;
  marginMinor?: number | null;
  marginPercentage?: number | null;
  meta: Record<string, unknown>;
}

export interface QuoteVersionDTO {
  version: number;
  note: string | null;
  createdAt: Date;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  travellerCount: number;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  grandTotalMinor: number;
  internal?: {
    supplierCostTotalMinor: number | null;
    marginTotalMinor: number | null;
    marginPercentage: number | null;
  };
  items: QuoteItemDTO[];
  itinerary: PlannerItineraryDoc;
  selections: PlannerRequest;
  pricingEngineVersion: string;
}

export interface QuoteDetailDTO {
  id: string;
  reference: string;
  status: QuoteStatus;
  tripId: string;
  tripName: string;
  currentVersion: number;
  customer: CustomerDTO;
  versions: QuoteVersionDTO[];
  createdAt: Date;
}

export interface QuoteListItemDTO {
  id: string;
  reference: string;
  customerName: string;
  tripName: string;
  status: QuoteStatus;
  currentVersion: number;
  grandTotalMinor: number;
  updatedAt: Date;
}
