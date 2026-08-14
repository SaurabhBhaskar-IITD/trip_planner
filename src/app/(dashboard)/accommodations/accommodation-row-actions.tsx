"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, Power, PowerOff } from "lucide-react";
import type { AccommodationListItemDTO } from "@/types/master-data";
import { setAccommodationActiveAction } from "@/server/actions/accommodation.actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Per-row actions. Editing (which needs the full detail shape) lives on the
 * property's detail workspace; the list offers Open + activate/deactivate. The
 * server independently enforces accommodation:write.
 */
export function AccommodationRowActions({
  accommodation,
  canWrite,
}: {
  accommodation: AccommodationListItemDTO;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open property" asChild>
            <Link href={`/accommodations/${accommodation.id}`}>
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
              aria-label={accommodation.active ? "Deactivate" : "Activate"}
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setAccommodationActiveAction(accommodation.id, !accommodation.active);
                })
              }
            >
              {accommodation.active ? (
                <PowerOff className="size-4 text-muted-foreground" />
              ) : (
                <Power className="size-4 text-success" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{accommodation.active ? "Deactivate" : "Activate"}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
