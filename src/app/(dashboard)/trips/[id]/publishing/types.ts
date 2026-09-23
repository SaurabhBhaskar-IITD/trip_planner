import type { ChargeBasis } from "@/domain/public-catalog/customization";

/** Serialisable view of one customization for the planner UI. */
export interface CustomizationView {
  addonId: string;
  name: string;
  /** What customers will read (trip override, else master text). */
  description: string | null;
  descriptionOverride: string | null;
  active: boolean;
  masterActive: boolean;
  sortOrder: number;
  isDefault: boolean;
  exclusiveGroup: string | null;
  priceOverrideMinor: number | null;
  priceOverrideUnit: string | null;
  /** Server-evaluated: would this be offered on trip-le.com if active? */
  sellable: boolean;
  reason: string | null;
  priceMinor: number | null;
  chargeBasis: ChargeBasis | null;
  priceSource: "override" | "catalogue" | null;
  updatedAt: string;
}

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
