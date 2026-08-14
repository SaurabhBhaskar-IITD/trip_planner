"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import type { RoomTypeDTO } from "@/types/master-data";
import {
  ACCOMMODATION_CATEGORIES,
  ROOM_TYPES,
  ROOM_TYPE_CAPACITY,
  humanizeEnum,
} from "@/domain/shared/enums";
import { createRoomTypeAction, updateRoomTypeAction } from "@/server/actions/room-type.actions";
import type { ActionResult } from "@/server/actions/action-result";
import { FormField } from "@/components/common/form-field";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RoomTypeForm({
  accommodationId,
  roomType,
  defaultCategory,
  onDone,
}: {
  accommodationId: string;
  roomType?: RoomTypeDTO;
  defaultCategory?: string;
  onDone: () => void;
}) {
  const action = roomType
    ? updateRoomTypeAction.bind(null, roomType.id)
    : createRoomTypeAction.bind(null, accommodationId);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField label="Room type name" htmlFor="name" required error={fieldErrors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          defaultValue={roomType?.name}
          placeholder="e.g. Deluxe Room"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Occupancy" htmlFor="occupancy" required error={fieldErrors?.occupancy?.[0]}>
          <Select name="occupancy" defaultValue={roomType?.occupancy ?? "double"}>
            <SelectTrigger id="occupancy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map((o) => (
                <SelectItem key={o} value={o}>
                  {humanizeEnum(o)} ({ROOM_TYPE_CAPACITY[o]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Category" htmlFor="category" required error={fieldErrors?.category?.[0]}>
          <Select name="category" defaultValue={roomType?.category ?? defaultCategory ?? "standard"}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOMMODATION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {humanizeEnum(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        label="Max occupancy"
        htmlFor="maxOccupancy"
        hint="Optional cap, e.g. with an extra bed."
        error={fieldErrors?.maxOccupancy?.[0]}
      >
        <Input
          id="maxOccupancy"
          name="maxOccupancy"
          type="number"
          min={1}
          max={20}
          defaultValue={roomType?.maxOccupancy ?? ""}
          placeholder="—"
          className="sm:w-32"
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={roomType?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {roomType ? "Save changes" : "Add room type"}
        </SubmitButton>
      </div>
    </form>
  );
}
