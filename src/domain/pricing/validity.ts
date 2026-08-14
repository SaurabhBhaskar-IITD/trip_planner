/**
 * Pure price-validity helpers (no framework, no Prisma).
 *
 * Season-scoped price rows must not silently overlap: two ACTIVE prices for the
 * same parent + same pricing unit whose season and validity windows both overlap
 * are ambiguous (which one applies?). We detect that here so the application layer
 * can reject the conflict rather than let a later row silently shadow an earlier
 * one. Kept pure so it is fully unit-testable without a database.
 */

import type { PricingUnit, Season } from "@/domain/shared/enums";

/** The minimal shape needed to reason about price-row conflicts. */
export interface PriceValidityWindow {
  id?: string;
  unit: PricingUnit;
  season: Season | null;
  validFrom: Date | null;
  validUntil: Date | null;
  active: boolean;
}

/** Two date windows overlap; a null bound is treated as open (±infinity). */
export function dateWindowsOverlap(
  aFrom: Date | null,
  aUntil: Date | null,
  bFrom: Date | null,
  bUntil: Date | null,
): boolean {
  const aStart = aFrom ? aFrom.getTime() : -Infinity;
  const aEnd = aUntil ? aUntil.getTime() : Infinity;
  const bStart = bFrom ? bFrom.getTime() : -Infinity;
  const bEnd = bUntil ? bUntil.getTime() : Infinity;
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Seasons collide when they are the same, when either side is the catch-all
 * `all`, or when either is unset (an unscoped price competes with everything).
 */
export function seasonsCollide(a: Season | null, b: Season | null): boolean {
  if (a === null || b === null) return true;
  if (a === "all" || b === "all") return true;
  return a === b;
}

/**
 * Returns the first existing ACTIVE row that would conflict with `candidate`
 * (same unit, colliding season, overlapping validity), or null if none.
 * A candidate carrying an `id` never conflicts with itself.
 */
export function findPricingConflict(
  candidate: PriceValidityWindow,
  existing: PriceValidityWindow[],
): PriceValidityWindow | null {
  if (!candidate.active) return null; // an inactive draft price cannot shadow anything
  for (const row of existing) {
    if (!row.active) continue;
    if (row.id && candidate.id && row.id === candidate.id) continue;
    if (row.unit !== candidate.unit) continue;
    if (!seasonsCollide(row.season, candidate.season)) continue;
    if (
      dateWindowsOverlap(
        candidate.validFrom,
        candidate.validUntil,
        row.validFrom,
        row.validUntil,
      )
    ) {
      return row;
    }
  }
  return null;
}
