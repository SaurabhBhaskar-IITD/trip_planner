"use client";

import { useState, type ReactNode } from "react";
import type { AddonDetailDTO } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AddonForm } from "./addon-form";

export function AddonDialog({
  trigger,
  addon,
}: {
  trigger: ReactNode;
  addon?: AddonDetailDTO;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{addon ? "Edit add-on" : "New add-on"}</DialogTitle>
          <DialogDescription>
            Optional extras (transfers, upgrades, insurance…). Pricing is on the detail page.
          </DialogDescription>
        </DialogHeader>
        <AddonForm addon={addon} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
