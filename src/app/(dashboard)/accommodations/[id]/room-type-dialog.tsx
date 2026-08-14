"use client";

import { useState, type ReactNode } from "react";
import type { RoomTypeDTO } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoomTypeForm } from "./room-type-form";

export function RoomTypeDialog({
  trigger,
  accommodationId,
  roomType,
  defaultCategory,
}: {
  trigger: ReactNode;
  accommodationId: string;
  roomType?: RoomTypeDTO;
  defaultCategory?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roomType ? "Edit room type" : "New room type"}</DialogTitle>
          <DialogDescription>
            Room types belong to this property. Occupancy uses the fixed system vocabulary.
          </DialogDescription>
        </DialogHeader>
        <RoomTypeForm
          accommodationId={accommodationId}
          roomType={roomType}
          defaultCategory={defaultCategory}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
