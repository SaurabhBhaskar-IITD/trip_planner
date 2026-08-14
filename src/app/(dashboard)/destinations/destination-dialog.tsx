"use client";

import { useState, type ReactNode } from "react";
import type { DestinationDTO } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DestinationForm } from "./destination-form";

/**
 * Create/edit destination dialog. Uncontrolled trigger; closes itself on a
 * successful save (the server action revalidates the list).
 */
export function DestinationDialog({
  trigger,
  destination,
}: {
  trigger: ReactNode;
  destination?: DestinationDTO;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{destination ? "Edit destination" : "New destination"}</DialogTitle>
          <DialogDescription>
            Destinations are reusable across trips.{" "}
            {destination ? "" : "Create one once and attach it to any trip."}
          </DialogDescription>
        </DialogHeader>
        <DestinationForm destination={destination} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
