import { cn } from "@/lib/utils/cn";
import { formatMinorAsINR, pricingUnitLabel } from "@/lib/utils/format";
import type { PricingUnit } from "@/domain/shared/enums";

/**
 * Human-friendly money display. Takes integer MINOR units (paise) — the DB's
 * canonical form — and renders "₹3,500", optionally with a unit suffix
 * ("₹3,500 / room / night"). This is the ONLY place minor→major happens for
 * display; never format money by hand elsewhere.
 */
export function PriceDisplay({
  amountMinor,
  unit,
  withDecimals,
  className,
}: {
  amountMinor: number;
  unit?: PricingUnit;
  withDecimals?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      <span className="font-medium text-foreground">
        {formatMinorAsINR(amountMinor, { withDecimals })}
      </span>
      {unit ? (
        <span className="text-xs text-muted-foreground"> / {pricingUnitLabel(unit)}</span>
      ) : null}
    </span>
  );
}
