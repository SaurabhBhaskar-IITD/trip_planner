import "server-only";
import type { PriceDTO } from "@/types/master-data";
import type { PricingUnit, Season } from "@/domain/shared/enums";

/**
 * Maps a raw Prisma price row (any of the five price tables) to the serialisable
 * PriceDTO. Two boundary rules are enforced here:
 *   1. BigInt minor units → number (BigInt is not serialisable across RSC).
 *   2. `supplierCostMinor` (INTERNAL) is included ONLY when the caller holds
 *      pricing:viewInternal — otherwise the field is omitted entirely, so it can
 *      never leak to an unauthorised surface.
 */
export interface RawPriceRow {
  id: string;
  amountMinor: bigint;
  currency: string;
  unit: string;
  supplierCostMinor: bigint | null;
  season: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  active: boolean;
  // Only accommodation_prices carries these; undefined for other tables.
  minPax?: number | null;
  maxPax?: number | null;
}

export function toPriceDTO(row: RawPriceRow, includeInternal: boolean): PriceDTO {
  return {
    id: row.id,
    amountMinor: Number(row.amountMinor),
    currency: row.currency,
    unit: row.unit as PricingUnit,
    season: (row.season as Season | null) ?? null,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    minPax: row.minPax ?? null,
    maxPax: row.maxPax ?? null,
    active: row.active,
    ...(includeInternal
      ? {
          supplierCostMinor:
            row.supplierCostMinor === null ? null : Number(row.supplierCostMinor),
        }
      : {}),
  };
}
