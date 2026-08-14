"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, Power, PowerOff } from "lucide-react";
import type { AddonListItemDTO } from "@/types/master-data";
import { setAddonActiveAction } from "@/server/actions/addon.actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AddonRowActions({
  addon,
  canWrite,
}: {
  addon: AddonListItemDTO;
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open add-on" asChild>
            <Link href={`/addons/${addon.id}`}>
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
              aria-label={addon.active ? "Deactivate" : "Activate"}
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void setAddonActiveAction(addon.id, !addon.active);
                })
              }
            >
              {addon.active ? (
                <PowerOff className="size-4 text-muted-foreground" />
              ) : (
                <Power className="size-4 text-success" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{addon.active ? "Deactivate" : "Activate"}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
