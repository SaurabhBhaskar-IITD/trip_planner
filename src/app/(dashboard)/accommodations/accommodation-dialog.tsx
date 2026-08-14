"use client";

import { useState, type ReactNode } from "react";
import type { AccommodationDetailDTO, DestinationOption } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AccommodationForm } from "./accommodation-form";

/** Create/edit accommodation dialog. New properties navigate to their detail page. */
export function AccommodationDialog({
  trigger,
  accommodation,
  destinationOptions,
}: {
  trigger: ReactNode;
  accommodation?: AccommodationDetailDTO;
  destinationOptions: DestinationOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{accommodation ? "Edit property" : "New property"}</DialogTitle>
          <DialogDescription>
            One record per property. Room types and pricing are managed on the property&apos;s
            detail page.
          </DialogDescription>
        </DialogHeader>
        <AccommodationForm
          accommodation={accommodation}
          destinationOptions={destinationOptions}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
