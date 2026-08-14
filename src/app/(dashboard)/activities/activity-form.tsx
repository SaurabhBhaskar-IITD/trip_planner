"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { ActivityDetailDTO, DestinationOption } from "@/types/master-data";
import { ACTIVITY_TYPES, humanizeEnum } from "@/domain/shared/enums";
import { createActivityAction, updateActivityAction } from "@/server/actions/activity.actions";
import type { ActionResult } from "@/server/actions/action-result";
import { FormField } from "@/components/common/form-field";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function ActivityForm({
  activity,
  destinationOptions,
  onDone,
}: {
  activity?: ActivityDetailDTO;
  destinationOptions: DestinationOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const action = activity
    ? updateActivityAction.bind(null, activity.id)
    : createActivityAction;
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      if (activity) onDone();
      else router.push(`/activities/${state.data.id}`);
    }
  }, [state, activity, onDone, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField label="Name" htmlFor="name" required error={fieldErrors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          defaultValue={activity?.name}
          placeholder="e.g. Paragliding (Solang)"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Type" htmlFor="type" required error={fieldErrors?.type?.[0]}>
          <Select name="type" defaultValue={activity?.type ?? "sightseeing"}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {humanizeEnum(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Destination"
          htmlFor="destinationId"
          hint="Optional — some activities are generic."
          error={fieldErrors?.destinationId?.[0]}
        >
          <Select name="destinationId" defaultValue={activity?.destinationId ?? "none"}>
            <SelectTrigger id="destinationId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No destination</SelectItem>
              {destinationOptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <FormField
        label="Duration (minutes)"
        htmlFor="durationMinutes"
        hint="Optional."
        error={fieldErrors?.durationMinutes?.[0]}
      >
        <Input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          min={1}
          defaultValue={activity?.durationMinutes ?? ""}
          placeholder="e.g. 30"
          className="sm:w-40"
        />
      </FormField>

      <FormField label="Description" htmlFor="description" error={fieldErrors?.description?.[0]}>
        <Textarea
          id="description"
          name="description"
          defaultValue={activity?.description ?? ""}
          placeholder="Short internal description (optional)"
          rows={3}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={activity?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {activity ? "Save changes" : "Create activity"}
        </SubmitButton>
      </div>
    </form>
  );
}
