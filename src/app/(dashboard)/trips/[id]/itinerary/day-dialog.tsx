"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { DestinationOption, ItineraryDayDTO } from "@/types/master-data";
import { addDayAction, updateDayAction } from "@/server/actions/itinerary.actions";
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

export function DayDialog({
  tripId,
  day,
  destinationOptions,
  trigger,
}: {
  tripId: string;
  day?: ItineraryDayDTO;
  destinationOptions: DestinationOption[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = day ? updateDayAction.bind(null, tripId, day.id) : addDayAction.bind(null, tripId);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );
  const [fromId, setFromId] = useState(day?.fromDestinationId ?? "");
  const [toId, setToId] = useState(day?.toDestinationId ?? "");

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day ? `Edit Day ${day.dayNumber}` : "Add day"}</DialogTitle>
          <DialogDescription>Days are numbered automatically in order.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state && !state.ok && !state.fieldErrors ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <input type="hidden" name="fromDestinationId" value={fromId} />
          <input type="hidden" name="toDestinationId" value={toId} />

          <FormField label="Title" htmlFor="title" required error={fieldErrors?.title?.[0]}>
            <Input
              id="title"
              name="title"
              defaultValue={day?.title}
              placeholder="e.g. Arrival & Mall Road"
              required
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="From" htmlFor="from">
              <Select value={fromId || NONE} onValueChange={(v) => setFromId(v === NONE ? "" : v)}>
                <SelectTrigger id="from">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {destinationOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="To" htmlFor="to">
              <Select value={toId || NONE} onValueChange={(v) => setToId(v === NONE ? "" : v)}>
                <SelectTrigger id="to">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {destinationOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Summary" htmlFor="summary" error={fieldErrors?.summary?.[0]}>
            <Textarea
              id="summary"
              name="summary"
              defaultValue={day?.summary ?? ""}
              placeholder="Optional day summary"
              rows={2}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton pendingText="Saving…">{day ? "Save day" : "Add day"}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
