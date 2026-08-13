import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  icon?: LucideIcon;
  /** Rendered value. Omit (or pass null) to show the honest "unavailable" state. */
  value?: string | number | null;
  /** Small helper line under the value (e.g. comparison, unit). */
  hint?: string;
  /**
   * When true, the metric cannot be computed yet (no data source). We show an
   * explicit placeholder instead of inventing a number.
   */
  unavailable?: boolean;
  unavailableReason?: string;
  className?: string;
}

export function StatCard({
  label,
  icon: Icon,
  value,
  hint,
  unavailable,
  unavailableReason = "Available once data is connected",
  className,
}: StatCardProps) {
  const showValue = !unavailable && value !== null && value !== undefined;
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          {showValue ? (
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground/70">—</p>
          )}
          <p className="text-xs text-muted-foreground">{showValue ? hint : unavailableReason}</p>
        </div>
        {Icon ? (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
