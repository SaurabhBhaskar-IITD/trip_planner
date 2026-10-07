import type { ChargeBasis } from "@/domain/public-catalog/customization";
import type { AddonCategory } from "@/domain/shared/enums";

/** Serialisable view of one customization for the planner UI. */
export interface CustomizationView {
  addonId: string;
  name: string;
  /** What customers will read (trip override, else master text). */
  description: string | null;
  descriptionOverride: string | null;
  /** null = uncategorised: never offered in the customer customization flow. */
  category: AddonCategory | null;
  active: boolean;
  masterActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  isRecommended: boolean;
  priceOnRequest: boolean;
  availabilityNote: string | null;
  roomOccupancy: number | null;
  exclusiveGroup: string | null;
  priceOverrideMinor: number | null;
  priceOverrideUnit: string | null;
  /** Server-evaluated: would this be offered on trip-le.com if active? */
  sellable: boolean;
  /** Offered for enquiry only (price on request). */
  onRequest: boolean;
  reason: string | null;
  priceMinor: number | null;
  chargeBasis: ChargeBasis | null;
  priceSource: "override" | "catalogue" | null;
  /** INTERNAL — present only for users with pricing:viewInternal. */
  internal?: {
    note: string | null;
    supplierCostOverrideMinor: number | null;
    marginMinor: number | null;
  };
  updatedAt: string;
}

/** Short customer-facing suffix for a charge basis ("/ person / night"). */
export const BASIS_LABEL: Record<ChargeBasis, string> = {
  per_person: "person",
  per_booking: "booking",
  per_person_per_night: "person / night",
  per_room: "room",
  per_room_per_night: "room / night",
  per_night: "night",
};

export interface DocumentView {
  id: string;
  version: number;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface AddonChoice {
  id: string;
  name: string;
  category: AddonCategory | null;
}

export type NotifyStatus = "notified" | "skipped" | "failed";

/** Human sentence describing whether trip-le.com picked up the change. */
export function propagationMessage(status: NotifyStatus): string {
  switch (status) {
    case "notified":
      return "Saved — trip-le.com has been updated.";
    case "skipped":
      return "Saved. Website sync is not configured in this environment.";
    case "failed":
      return "Saved, but trip-le.com could not be reached. It will pick up the change within 60 seconds.";
  }
}
