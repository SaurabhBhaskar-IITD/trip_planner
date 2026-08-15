import type { ComponentKind, PricingUnit } from "@/domain/shared/enums";
import type { QuoteDetailDTO, QuoteListItemDTO } from "@/types/planner";

/** One frozen line snapshot to persist under a quote version. */
export interface CreateQuoteItemData {
  sortOrder: number;
  componentType: ComponentKind;
  componentId?: string | null;
  componentNameSnapshot: string;
  descriptionSnapshot?: string | null;
  quantity: number;
  unit: PricingUnit;
  unitPriceMinor: number;
  lineTotalMinor: number;
  supplierCostMinor?: number | null;
  marginMinor?: number | null;
  marginPercentage?: number | null;
  pricingMetadataSnapshot: unknown;
}

/** A full frozen quote-version snapshot (totals + itinerary + selections + items). */
export interface CreateQuoteVersionData {
  tripName: string;
  travelStartDate: Date | null;
  travelEndDate: Date | null;
  travellerCount: number;
  selections: unknown;
  itinerary: unknown;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  grandTotalMinor: number;
  supplierCostTotalMinor: number | null;
  marginTotalMinor: number | null;
  marginPercentage: number | null;
  pricingEngineVersion: string;
  note?: string | null;
  createdById?: string | null;
  items: CreateQuoteItemData[];
}

/**
 * Quote persistence with immutable versioning (§29, §30). Creating a quote or
 * adding a version writes a frozen snapshot; existing versions are never mutated.
 */
export interface QuoteStoreRepository {
  createQuote(data: {
    tripId: string;
    customerId: string;
    createdById?: string | null;
    version: CreateQuoteVersionData;
  }): Promise<{ id: string; reference: string; version: number }>;

  addVersion(quoteId: string, data: CreateQuoteVersionData): Promise<{ version: number }>;

  findDetail(id: string, opts: { includeInternal: boolean }): Promise<QuoteDetailDTO | null>;

  listRecent(limit: number): Promise<QuoteListItemDTO[]>;
}
