"use client";

import { useState, type ReactNode } from "react";
import type { MealDetailDTO } from "@/types/master-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MealForm } from "./meal-form";

export function MealDialog({
  trigger,
  meal,
}: {
  trigger: ReactNode;
  meal?: MealDetailDTO;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meal ? "Edit meal" : "New meal"}</DialogTitle>
          <DialogDescription>
            Meal types and plans use the fixed system vocabulary. Pricing is on the detail page.
          </DialogDescription>
        </DialogHeader>
        <MealForm meal={meal} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
