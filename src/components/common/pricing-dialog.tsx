"use client";

import { useState, type ReactNode } from "react";
import type { PriceDTO } from "@/types/master-data";
import type { PriceParentKind } from "@/domain/shared/enums";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PricingForm, type RoomTypeOption } from "./pricing-form";

/**
 * Create/edit dialog for a single price row. Reused by every module's PricingTable
 * (edit) and the "Add price" action (create). Closes on a successful save.
 */
export function PricingDialog({
  trigger,
  kind,
  parentId,
  detailPath,
  price,
  roomTypes,
  initialRoomTypeId,
  canViewInternal,
}: {
  trigger: ReactNode;
  kind: PriceParentKind;
  parentId: string;
  detailPath: string;
  price?: PriceDTO;
  roomTypes?: RoomTypeOption[];
  initialRoomTypeId?: string;
  canViewInternal: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{price ? "Edit price" : "Add price"}</DialogTitle>
          <DialogDescription>
            Seasonal, validity-scoped pricing. Overlapping active prices for the same unit are
            rejected to avoid ambiguity.
          </DialogDescription>
        </DialogHeader>
        <PricingForm
          kind={kind}
          parentId={parentId}
          detailPath={detailPath}
          price={price}
          roomTypes={roomTypes}
          initialRoomTypeId={initialRoomTypeId}
          canViewInternal={canViewInternal}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
