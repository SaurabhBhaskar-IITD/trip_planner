import type { PriceDTO } from "@/types/master-data";

/**
 * Choose WHICH stored price applies to a selection — never invent one (§1), and
 * never pick "randomly" when the data is ambiguous (§8, §14).
 *
 * Rules (deterministic):
 *  1. Only ACTIVE prices are eligible.
 *  2. If a travel date is given, keep only prices whose [validFrom, validUntil]
 *     window contains it (null bound = open). None in-window ⇒ `none`.
 *  3. Precedence: with a date, a SPECIFIC price (bounded window / seasonal) beats a
 *     generic year-round one; without a date, the GENERIC price is preferred
 *     rather than guessing which season a trip falls in.
 *  4. If two or more prices share the top precedence tier (e.g. two active generic
 *     prices, or two seasonal prices both in-window, or two different units), the
 *     result is `ambiguous` — the caller BLOCKS rather than choosing.
 */

export type PriceResolution =
  | { status: "ok"; price: PriceDTO }
  | { status: "none" }
  | { status: "ambiguous"; count: number };

function isGeneric(p: PriceDTO): boolean {
  return (p.season === null || p.season === "all") && !p.validFrom && !p.validUntil;
}

export function resolvePrice(
  prices: PriceDTO[],
  opts: { travelDate?: Date } = {},
): PriceResolution {
  const active = prices.filter((p) => p.active);
  if (active.length === 0) return { status: "none" };

  let pool = active;
  const dateGiven = Boolean(opts.travelDate);
  if (opts.travelDate) {
    const t = opts.travelDate.getTime();
    pool = active.filter((p) => {
      const from = p.validFrom ? new Date(p.validFrom).getTime() : -Infinity;
      const until = p.validUntil ? new Date(p.validUntil).getTime() : Infinity;
      return from <= t && t <= until;
    });
    if (pool.length === 0) return { status: "none" };
  }

  // Lower tier = preferred.
  const tier = (p: PriceDTO): number => {
    const generic = isGeneric(p);
    return dateGiven ? (generic ? 1 : 0) : generic ? 0 : 1;
  };
  const minTier = Math.min(...pool.map(tier));
  const top = pool.filter((p) => tier(p) === minTier);

  if (top.length > 1) return { status: "ambiguous", count: top.length };
  return { status: "ok", price: top[0]! };
}
