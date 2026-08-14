"use client";

import { useState, type ReactNode } from "react";
import type { ActivityDetailDTO, DestinationOption } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActivityForm } from "./activity-form";

export function ActivityDialog({
  trigger,
  activity,
  destinationOptions,
}: {
  trigger: ReactNode;
  activity?: ActivityDetailDTO;
  destinationOptions: DestinationOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit activity" : "New activity"}</DialogTitle>
          <DialogDescription>
            One record per activity. Pricing is managed on its detail page.
          </DialogDescription>
        </DialogHeader>
        <ActivityForm
          activity={activity}
          destinationOptions={destinationOptions}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
