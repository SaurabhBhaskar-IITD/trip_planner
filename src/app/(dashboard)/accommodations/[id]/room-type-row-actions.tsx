"use client";

import { useTransition } from "react";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import type { RoomTypeDTO } from "@/types/master-data";
import {
  deleteRoomTypeAction,
  setRoomTypeActiveAction,
} from "@/server/actions/room-type.actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RoomTypeDialog } from "./room-type-dialog";

export function RoomTypeRowActions({
  accommodationId,
  roomType,
}: {
  accommodationId: string;
  roomType: RoomTypeDTO;
}) {
  const [pending, startTransition] = useTransition();
  const hasPrices = roomType.prices.length > 0;

  return (
    <div className="flex items-center justify-end gap-1">
      <RoomTypeDialog
        accommodationId={accommodationId}
        roomType={roomType}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Edit room type">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={roomType.active ? "Deactivate" : "Activate"}
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void setRoomTypeActiveAction(roomType.id, !roomType.active);
              })
            }
          >
            {roomType.active ? (
              <PowerOff className="size-4 text-muted-foreground" />
            ) : (
              <Power className="size-4 text-success" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{roomType.active ? "Deactivate" : "Activate"}</TooltipContent>
      </Tooltip>
      <ConfirmDialog
        title={hasPrices ? "Delete room type and its prices?" : "Delete this room type?"}
        description={
          hasPrices
            ? `This room type has ${roomType.prices.length} price row(s), which will also be deleted. Prefer deactivating if it may be reused.`
            : "This permanently removes the room type. Prefer deactivating if it may be reused."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteRoomTypeAction(roomType.id)}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Delete room type" disabled={pending}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
      />
    </div>
  );
}
