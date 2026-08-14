"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, Power, PowerOff } from "lucide-react";
import type { MealListItemDTO } from "@/types/master-data";
import { setMealActiveAction } from "@/server/actions/meal.actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function MealRowActions({
  meal,
  canWrite,
}: {
  meal: MealListItemDTO;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open meal" asChild>
            <Link href={`/meals/${meal.id}`}>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open</TooltipContent>
      </Tooltip>

      {canWrite ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={meal.active ? "Deactivate" : "Activate"}
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setMealActiveAction(meal.id, !meal.active);
                })
              }
            >
              {meal.active ? (
                <PowerOff className="size-4 text-muted-foreground" />
              ) : (
                <Power className="size-4 text-success" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{meal.active ? "Deactivate" : "Activate"}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
