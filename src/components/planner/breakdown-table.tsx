import type { PricingUnit } from "@/domain/shared/enums";
import { formatMinorAsINR, pricingUnitLabel } from "@/lib/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Normalised line shape shared by live calculations and frozen quote items. */
export interface BreakdownLine {
  label: string;
  allocationNote?: string;
  unit: PricingUnit;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  supplierCostMinor?: number | null;
  marginMinor?: number | null;
  marginPercentage?: number | null;
}

/**
 * Transparent price breakdown (§17). Never renders only a total. Internal columns
 * (supplier/margin) appear only when `canViewInternal`. Tax is shown as "Not
 * configured" in the MVP rather than invented (§18).
 */
export function BreakdownTable({
  lines,
  subtotalMinor,
  discountTotalMinor,
  taxTotalMinor,
  taxConfigured,
  grandTotalMinor,
  canViewInternal,
  internal,
}: {
  lines: BreakdownLine[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  taxConfigured: boolean;
  grandTotalMinor: number;
  canViewInternal: boolean;
  internal?: { supplierCostTotalMinor: number | null; marginTotalMinor: number | null; marginPercentage: number | null } | null;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Component</TableHead>
              <TableHead>Basis</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Line total</TableHead>
              {canViewInternal ? <TableHead className="text-right">Margin</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canViewInternal ? 6 : 5} className="text-center text-muted-foreground">
                  No priced components yet.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{l.label}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.allocationNote ? `${l.allocationNote} · ` : ""}
                    per {pricingUnitLabel(l.unit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinorAsINR(l.unitPriceMinor)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMinorAsINR(l.lineTotalMinor)}
                  </TableCell>
                  {canViewInternal ? (
                    <TableCell className="text-right text-xs tabular-nums">
                      {l.marginMinor != null ? (
                        <span className={l.marginMinor < 0 ? "text-destructive" : "text-success"}>
                          {formatMinorAsINR(l.marginMinor)}
                          {l.marginPercentage != null ? ` (${l.marginPercentage}%)` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <Row label="Subtotal" value={formatMinorAsINR(subtotalMinor)} />
        {discountTotalMinor > 0 ? (
          <Row label="Discount" value={`− ${formatMinorAsINR(discountTotalMinor)}`} />
        ) : null}
        <Row
          label="Tax / GST"
          value={taxConfigured ? formatMinorAsINR(taxTotalMinor) : "Not configured"}
          muted={!taxConfigured}
        />
        {/* §25 — the final price is the strongest element on the page. */}
        <div className="mt-2 rounded-lg border border-primary/30 bg-accent/60 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
            Total trip price
          </div>
          <div className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
            {formatMinorAsINR(grandTotalMinor)}
          </div>
        </div>
        {canViewInternal && internal ? (
          <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Supplier cost</span>
              <span className="tabular-nums">
                {internal.supplierCostTotalMinor != null
                  ? formatMinorAsINR(internal.supplierCostTotalMinor)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Margin</span>
              <span className="tabular-nums">
                {internal.marginTotalMinor != null
                  ? `${formatMinorAsINR(internal.marginTotalMinor)}${
                      internal.marginPercentage != null ? ` (${internal.marginPercentage}%)` : ""
                    }`
                  : "—"}
              </span>
            </div>
            <div className="mt-1 italic">Internal — never shown to customers.</div>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "tabular-nums"}>{value}</span>
    </div>
  );
}
