import type { AuditInfo, EntityId, MoneyDTO } from "./common";
import type { ComponentKind, PricingUnit, QuoteStatus, RoomType } from "@/domain/shared/enums";

/**
 * Quote domain model — designed around HISTORICAL ACCURACY (spec §4).
 *
 * A quote NEVER references live master prices. When it is created, every selected
 * component is frozen into a `QuoteItemSnapshot` capturing the exact price used.
 * If the hotel's master price later changes ₹3,500 -> ₹4,000, this quote still
 * shows ₹3,500 because it reads its own snapshot, not the catalogue.
 *
 * `internal` (supplier cost / margin) is INTERNAL-ONLY and stripped by public DTO
 * mappers before any customer-facing surface.
 */

export interface QuoteItemSnapshot {
  /** Reference back to the catalogue item this was derived from (audit only). */
  sourceId?: EntityId;
  kind: ComponentKind;
  /** Human label frozen at snapshot time (e.g. "Deluxe Double Room — Hotel X"). */
  label: string;
  unit: PricingUnit;
  /** Frozen unit price actually used. */
  unitPrice: MoneyDTO;
  quantity: number;
  /** unitPrice * quantity (also frozen; recomputed defensively on read). */
  lineTotal: MoneyDTO;
  /** INTERNAL: frozen supplier cost & margin for this line. */
  internal?: {
    supplierCost: MoneyDTO;
    margin: MoneyDTO;
    marginPercentage: number;
  };
  meta?: Record<string, string | number | boolean>;
}

export interface RoomSelection {
  roomType: RoomType;
  count: number;
}

export interface QuoteSelections {
  travelStartDate: Date;
  travelEndDate: Date;
  travellerCount: number;
  rooms: RoomSelection[];
  accommodationIds: EntityId[];
  transportIds: EntityId[];
  activityIds: EntityId[];
  mealIds: EntityId[];
  addonIds: EntityId[];
  appliedRuleIds: EntityId[];
  customServices: Array<{ label: string; price: MoneyDTO }>;
}

/** Frozen commercial totals for one quote version. */
export interface QuoteTotals {
  subtotal: MoneyDTO;
  discountTotal: MoneyDTO;
  taxTotal: MoneyDTO;
  grandTotal: MoneyDTO;
  /** INTERNAL-ONLY commercial view. */
  internal?: {
    supplierCostTotal: MoneyDTO;
    marginTotal: MoneyDTO;
    marginPercentage: number;
  };
}

export interface QuoteVersion {
  version: number;
  createdAt: Date;
  createdBy?: EntityId;
  note?: string;
  selections: QuoteSelections;
  items: QuoteItemSnapshot[];
  totals: QuoteTotals;
  /** Engine version that produced these numbers — for reproducibility. */
  pricingEngineVersion: string;
}

export interface Quote {
  id: EntityId;
  reference: string; // e.g. TL-2026-000123
  tripId: EntityId;
  tripSnapshotName: string;
  customerId: EntityId;
  status: QuoteStatus;
  currentVersion: number;
  versions: QuoteVersion[];
  audit: AuditInfo;
}
