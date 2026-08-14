import type { CurrencyCode } from "@/domain/shared/money";
import type { PricingUnit, Season } from "@/domain/shared/enums";

/** Opaque entity id (a Postgres cuid). The domain never imports the ORM. */
export type EntityId = string;

export interface AuditInfo {
  createdAt: Date;
  updatedAt: Date;
  createdBy?: EntityId;
  updatedBy?: EntityId;
}

/** Serialisable money at the domain/persistence boundary (integer minor units). */
export interface MoneyDTO {
  minorUnits: number;
  currency: CurrencyCode;
}

/**
 * A priceable specification attached to a catalogue component.
 *
 * This is the raw, master-data price BEFORE it is resolved into a quote. It
 * carries validity/season/unit metadata so the pricing engine can select the
 * right rate for a given travel date and occupancy. `supplierCost` and markup
 * fields are INTERNAL and must be stripped before any public serialization.
 */
export interface PriceSpec {
  /** Customer-facing rate. */
  amount: MoneyDTO;
  unit: PricingUnit;
  /** INTERNAL: what Trip Le pays the supplier for the same unit. */
  supplierCost?: MoneyDTO;
  validFrom?: Date;
  validUntil?: Date;
  season?: Season;
  /** Occupancy/capacity qualifiers (e.g. this rate applies to `double` rooms). */
  minPax?: number;
  maxPax?: number;
  notes?: string;
}

export interface GeoRef {
  destinationId?: EntityId;
  name: string;
  region?: string;
}
