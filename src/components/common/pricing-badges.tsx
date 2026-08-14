import { Badge } from "@/components/ui/badge";
import { pricingUnitLabel } from "@/lib/utils/format";
import { humanizeEnum, type PricingUnit, type Season } from "@/domain/shared/enums";

/** Pill showing the pricing unit, e.g. "per room / night". */
export function PricingUnitBadge({ unit }: { unit: PricingUnit }) {
  return (
    <Badge variant="outline" className="font-normal">
      per {pricingUnitLabel(unit)}
    </Badge>
  );
}

const SEASON_VARIANT: Record<Season, "warning" | "secondary" | "outline"> = {
  peak: "warning",
  shoulder: "secondary",
  off_peak: "outline",
  all: "outline",
};

/** Optional season tag on a price row. Nothing renders when the season is unset. */
export function SeasonBadge({ season }: { season: Season | null }) {
  if (!season) return null;
  return <Badge variant={SEASON_VARIANT[season]}>{humanizeEnum(season)}</Badge>;
}

/**
 * Status of a single price row. Beyond active/inactive it surfaces "Expired"
 * (validUntil in the past) and "Scheduled" (validFrom in the future) so an
 * operator can see at a glance why a price may not currently apply.
 */
export function PricingStatusBadge({
  active,
  validFrom,
  validUntil,
  now = new Date(),
}: {
  active: boolean;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  now?: Date;
}) {
  if (!active) return <Badge variant="secondary">Inactive</Badge>;
  const from = validFrom ? new Date(validFrom) : null;
  const until = validUntil ? new Date(validUntil) : null;
  if (until && until.getTime() < now.getTime()) return <Badge variant="outline">Expired</Badge>;
  if (from && from.getTime() > now.getTime()) return <Badge variant="warning">Scheduled</Badge>;
  return <Badge variant="success">Active</Badge>;
}
