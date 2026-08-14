"use client";

import { useTransition } from "react";
import { Pencil, Power, PowerOff } from "lucide-react";
import type { DestinationDTO } from "@/types/master-data";
import { setDestinationActiveAction } from "@/server/actions/destination.actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DestinationDialog } from "./destination-dialog";

/**
 * Per-row actions. `canWrite` gates mutation controls at the UI level; the server
 * actions independently enforce `destination:write`.
 */
export function DestinationRowActions({
  destination,
  canWrite,
}: {
  destination: DestinationDTO;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (!canWrite) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <DestinationDialog
        destination={destination}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Edit destination">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={destination.active ? "Deactivate" : "Activate"}
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void setDestinationActiveAction(destination.id, !destination.active);
              })
            }
          >
            {destination.active ? (
              <PowerOff className="size-4 text-muted-foreground" />
            ) : (
              <Power className="size-4 text-success" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{destination.active ? "Deactivate" : "Activate"}</TooltipContent>
      </Tooltip>
    </div>
  );
}
