"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, Power, PowerOff } from "lucide-react";
import type { TransportationListItemDTO } from "@/types/master-data";
import { setTransportationActiveAction } from "@/server/actions/transportation.actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TransportationRowActions({
  transportation,
  canWrite,
}: {
  transportation: TransportationListItemDTO;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open transport" asChild>
            <Link href={`/transport/${transportation.id}`}>
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
              aria-label={transportation.active ? "Deactivate" : "Activate"}
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setTransportationActiveAction(transportation.id, !transportation.active);
                })
              }
            >
              {transportation.active ? (
                <PowerOff className="size-4 text-muted-foreground" />
              ) : (
                <Power className="size-4 text-success" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{transportation.active ? "Deactivate" : "Activate"}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
