"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { ItinerarySegmentDTO } from "@/types/master-data";
import { MEAL_TYPES, SEGMENT_TYPES, TRANSPORT_MODES, humanizeEnum } from "@/domain/shared/enums";
import { addSegmentAction, updateSegmentAction } from "@/server/actions/itinerary.actions";
import type { ActionResult } from "@/server/actions/action-result";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/common/form-field";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const NONE = "__none__";

export function SegmentDialog({
  tripId,
  dayId,
  segment,
  trigger,
}: {
  tripId: string;
  dayId: string;
  segment?: ItinerarySegmentDTO;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = segment
    ? updateSegmentAction.bind(null, tripId, segment.id)
    : addSegmentAction.bind(null, tripId, dayId);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  const [type, setType] = useState(segment?.type ?? "sightseeing");
  const [transportMode, setTransportMode] = useState(segment?.transportMode ?? "");
  const [mealType, setMealType] = useState(segment?.mealType ?? "");

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{segment ? "Edit segment" : "Add segment"}</DialogTitle>
          <DialogDescription>Segments are ordered within the day.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state && !state.ok && !state.fieldErrors ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="transportMode" value={transportMode} />
          <input type="hidden" name="mealType" value={mealType} />

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" htmlFor="type" required>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENT_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {humanizeEnum(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Title" htmlFor="title" required error={fieldErrors?.title?.[0]}>
              <Input
                id="title"
                name="title"
                defaultValue={segment?.title}
                placeholder="e.g. Mall Road walk"
                required
                autoFocus
              />
            </FormField>
          </div>

          {type === "transfer" ? (
            <FormField label="Transport mode" htmlFor="transportMode">
              <Select
                value={transportMode || NONE}
                onValueChange={(v) =>
                  setTransportMode(v === NONE ? "" : (v as typeof transportMode))
                }
              >
                <SelectTrigger id="transportMode">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {TRANSPORT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {humanizeEnum(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          {type === "meal" ? (
            <FormField label="Meal type" htmlFor="mealType">
              <Select
                value={mealType || NONE}
                onValueChange={(v) => setMealType(v === NONE ? "" : (v as typeof mealType))}
              >
                <SelectTrigger id="mealType">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {MEAL_TYPES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {humanizeEnum(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          <FormField label="Detail" htmlFor="detail" error={fieldErrors?.detail?.[0]}>
            <Textarea
              id="detail"
              name="detail"
              defaultValue={segment?.detail ?? ""}
              placeholder="Optional detail"
              rows={2}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingText="Saving…">
              {segment ? "Save segment" : "Add segment"}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
