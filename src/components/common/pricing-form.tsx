"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import type { PriceDTO } from "@/types/master-data";
import {
  PRICING_UNITS_BY_KIND,
  SEASONS,
  humanizeEnum,
  type PriceParentKind,
} from "@/domain/shared/enums";
import { pricingUnitLabel } from "@/lib/utils/format";
import { createPriceAction, updatePriceAction } from "@/server/actions/pricing.actions";
import type { ActionResult } from "@/server/actions/action-result";
import { FormField } from "@/components/common/form-field";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";

/** Room-type option for the accommodation pricing selector. */
export interface RoomTypeOption {
  id: string;
  name: string;
  occupancy: string;
}

function dateInputValue(d?: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

/**
 * The single pricing form reused by every module. It renders only the fields
 * relevant to the selected kind/unit (§19): accommodation shows a room-type
 * selector; person/room-scoped units reveal an optional pax range. Supplier cost
 * appears only for callers holding pricing:viewInternal.
 */
export function PricingForm({
  kind,
  parentId,
  detailPath,
  price,
  roomTypes,
  initialRoomTypeId,
  canViewInternal,
  onDone,
}: {
  kind: PriceParentKind;
  parentId: string;
  detailPath: string;
  price?: PriceDTO;
  roomTypes?: RoomTypeOption[];
  initialRoomTypeId?: string;
  canViewInternal: boolean;
  onDone: () => void;
}) {
  const isEdit = Boolean(price);
  const action = price
    ? updatePriceAction.bind(null, kind, price.id, detailPath)
    : createPriceAction.bind(null, kind, parentId, detailPath);

  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  const units = PRICING_UNITS_BY_KIND[kind];
  const [unit, setUnit] = useState<string>(price?.unit ?? units[0]!);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const showPax = kind === "accommodation" || unit.includes("per_person");

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {kind === "accommodation" ? (
        <FormField
          label="Room type"
          htmlFor="roomTypeId"
          required
          error={fieldErrors?.roomTypeId?.[0]}
          hint={isEdit ? "Room type is fixed for an existing price." : undefined}
        >
          {isEdit ? (
            <Input
              value={roomTypes?.find((r) => r.id === (initialRoomTypeId ?? ""))?.name ?? "Room type"}
              disabled
            />
          ) : (
            <Select name="roomTypeId" defaultValue={initialRoomTypeId ?? roomTypes?.[0]?.id}>
              <SelectTrigger id="roomTypeId">
                <SelectValue placeholder="Choose a room type" />
              </SelectTrigger>
              <SelectContent>
                {(roomTypes ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {humanizeEnum(r.occupancy)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Selling price (₹)"
          htmlFor="amountMajor"
          required
          error={fieldErrors?.amountMajor?.[0]}
        >
          <Input
            id="amountMajor"
            name="amountMajor"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={price ? price.amountMinor / 100 : ""}
            placeholder="e.g. 3500"
            required
            autoFocus
          />
        </FormField>

        <FormField label="Pricing unit" htmlFor="unit" required error={fieldErrors?.unit?.[0]}>
          <Select name="unit" value={unit} onValueChange={setUnit}>
            <SelectTrigger id="unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  per {pricingUnitLabel(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {canViewInternal ? (
        <FormField
          label="Supplier cost (₹)"
          htmlFor="supplierCostMajor"
          hint="Internal only — used for margin. Never shown on customer surfaces."
          error={fieldErrors?.supplierCostMajor?.[0]}
        >
          <Input
            id="supplierCostMajor"
            name="supplierCostMajor"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            defaultValue={
              price?.supplierCostMinor != null ? price.supplierCostMinor / 100 : ""
            }
            placeholder="Optional"
          />
        </FormField>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Season" htmlFor="season" error={fieldErrors?.season?.[0]}>
          <Select name="season" defaultValue={price?.season ?? "all"}>
            <SelectTrigger id="season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {humanizeEnum(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Valid from" htmlFor="validFrom" error={fieldErrors?.validFrom?.[0]}>
          <Input
            id="validFrom"
            name="validFrom"
            type="date"
            defaultValue={dateInputValue(price?.validFrom)}
          />
        </FormField>
        <FormField label="Valid until" htmlFor="validUntil" error={fieldErrors?.validUntil?.[0]}>
          <Input
            id="validUntil"
            name="validUntil"
            type="date"
            defaultValue={dateInputValue(price?.validUntil)}
          />
        </FormField>
      </div>

      {showPax ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Min pax"
            htmlFor="minPax"
            hint="Optional occupancy / group floor."
            error={fieldErrors?.minPax?.[0]}
          >
            <Input
              id="minPax"
              name="minPax"
              type="number"
              min={1}
              defaultValue={price?.minPax ?? ""}
              placeholder="—"
            />
          </FormField>
          <FormField label="Max pax" htmlFor="maxPax" error={fieldErrors?.maxPax?.[0]}>
            <Input
              id="maxPax"
              name="maxPax"
              type="number"
              min={1}
              defaultValue={price?.maxPax ?? ""}
              placeholder="—"
            />
          </FormField>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={price?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {price ? "Save price" : "Add price"}
        </SubmitButton>
      </div>
    </form>
  );
}
