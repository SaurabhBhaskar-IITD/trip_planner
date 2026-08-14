"use client";

import { useTransition } from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import type { PriceDTO } from "@/types/master-data";
import type { PriceParentKind } from "@/domain/shared/enums";
import { deletePriceAction, setPriceActiveAction } from "@/server/actions/pricing.actions";
import { formatDate, formatPercent } from "@/lib/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PriceDisplay } from "./price-display";
import { PricingStatusBadge, PricingUnitBadge, SeasonBadge } from "./pricing-badges";
import { PricingDialog } from "./pricing-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import type { RoomTypeOption } from "./pricing-form";

/**
 * Reusable price grid for every module. Internal columns (supplier cost, margin)
 * are rendered ONLY when `canViewInternal` — and the server independently strips
 * those fields from the DTO for unauthorised callers, so this is defence in depth,
 * not the only gate.
 */
export function PricingTable({
  kind,
  parentId,
  detailPath,
  prices,
  canWrite,
  canViewInternal,
  roomTypes,
  initialRoomTypeId,
}: {
  kind: PriceParentKind;
  parentId: string;
  detailPath: string;
  prices: PriceDTO[];
  canWrite: boolean;
  canViewInternal: boolean;
  roomTypes?: RoomTypeOption[];
  initialRoomTypeId?: string;
}) {
  if (prices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card/50 px-4 py-6 text-center text-sm text-muted-foreground">
        No pricing yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Price</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Season</TableHead>
            <TableHead>Validity</TableHead>
            {canViewInternal ? (
              <>
                <TableHead className="text-right">Supplier</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </>
            ) : null}
            <TableHead>Status</TableHead>
            {canWrite ? <TableHead className="w-28 text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {prices.map((p) => (
            <PriceRow
              key={p.id}
              price={p}
              kind={kind}
              parentId={parentId}
              detailPath={detailPath}
              canWrite={canWrite}
              canViewInternal={canViewInternal}
              roomTypes={roomTypes}
              initialRoomTypeId={initialRoomTypeId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PriceRow({
  price,
  kind,
  parentId,
  detailPath,
  canWrite,
  canViewInternal,
  roomTypes,
  initialRoomTypeId,
}: {
  price: PriceDTO;
  kind: PriceParentKind;
  parentId: string;
  detailPath: string;
  canWrite: boolean;
  canViewInternal: boolean;
  roomTypes?: RoomTypeOption[];
  initialRoomTypeId?: string;
}) {
  const [pending, startTransition] = useTransition();

  // Integer-exact margin (both operands are minor units). Display only.
  const marginMinor =
    price.supplierCostMinor != null ? price.amountMinor - price.supplierCostMinor : null;
  const marginPct =
    marginMinor != null && price.amountMinor > 0
      ? (marginMinor / price.amountMinor) * 100
      : null;

  const validity =
    price.validFrom || price.validUntil
      ? `${price.validFrom ? formatDate(price.validFrom) : "—"} → ${
          price.validUntil ? formatDate(price.validUntil) : "—"
        }`
      : "Any dates";

  return (
    <TableRow>
      <TableCell>
        <PriceDisplay amountMinor={price.amountMinor} unit={price.unit} />
        {price.minPax || price.maxPax ? (
          <div className="text-xs text-muted-foreground">
            {price.minPax ?? 1}–{price.maxPax ?? "∞"} pax
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <PricingUnitBadge unit={price.unit} />
      </TableCell>
      <TableCell>
        <SeasonBadge season={price.season} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{validity}</TableCell>
      {canViewInternal ? (
        <>
          <TableCell className="text-right">
            {price.supplierCostMinor != null ? (
              <PriceDisplay amountMinor={price.supplierCostMinor} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="text-right text-xs">
            {marginMinor != null ? (
              <div className={marginMinor < 0 ? "text-destructive" : "text-success"}>
                <PriceDisplay amountMinor={marginMinor} />
                {marginPct != null ? (
                  <div className="text-muted-foreground">{formatPercent(marginPct)}</div>
                ) : null}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
        </>
      ) : null}
      <TableCell>
        <PricingStatusBadge
          active={price.active}
          validFrom={price.validFrom}
          validUntil={price.validUntil}
        />
      </TableCell>
      {canWrite ? (
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <PricingDialog
              kind={kind}
              parentId={parentId}
              detailPath={detailPath}
              price={price}
              roomTypes={roomTypes}
              initialRoomTypeId={initialRoomTypeId}
              canViewInternal={canViewInternal}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Edit price">
                  <Pencil className="size-4" />
                </Button>
              }
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={price.active ? "Deactivate price" : "Activate price"}
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => {
                      void setPriceActiveAction(kind, price.id, !price.active, detailPath);
                    })
                  }
                >
                  {price.active ? (
                    <PowerOff className="size-4 text-muted-foreground" />
                  ) : (
                    <Power className="size-4 text-success" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{price.active ? "Deactivate" : "Activate"}</TooltipContent>
            </Tooltip>
            <ConfirmDialog
              title="Delete this price?"
              description="This permanently removes the price row. Prefer deactivating if it may be needed again."
              confirmLabel="Delete"
              destructive
              onConfirm={() => deletePriceAction(kind, price.id, detailPath)}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete price" disabled={pending}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              }
            />
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}
