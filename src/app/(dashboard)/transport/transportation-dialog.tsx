"use client";

import { useState, type ReactNode } from "react";
import type { TransportationDetailDTO } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransportationForm } from "./transportation-form";

export function TransportationDialog({
  trigger,
  transportation,
}: {
  trigger: ReactNode;
  transportation?: TransportationDetailDTO;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{transportation ? "Edit transport" : "New transport"}</DialogTitle>
          <DialogDescription>
            One record per transport option. Route pricing is managed on its detail page.
          </DialogDescription>
        </DialogHeader>
        <TransportationForm transportation={transportation} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
