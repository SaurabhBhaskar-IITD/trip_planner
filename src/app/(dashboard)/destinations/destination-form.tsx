"use client";

import { useActionState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import type { DestinationDTO } from "@/types/master-data";
import {
  createDestinationAction,
  updateDestinationAction,
} from "@/server/actions/destination.actions";
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

export function DestinationForm({
  destination,
  onDone,
}: {
  destination?: DestinationDTO;
  onDone: () => void;
}) {
  const action = destination
    ? updateDestinationAction.bind(null, destination.id)
    : createDestinationAction;

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

      <FormField label="Name" htmlFor="name" required error={fieldErrors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          defaultValue={destination?.name}
          placeholder="e.g. Manali"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Region" htmlFor="region" error={fieldErrors?.region?.[0]}>
          <Input
            id="region"
            name="region"
            defaultValue={destination?.region ?? ""}
            placeholder="e.g. Himachal Pradesh"
          />
        </FormField>
        <FormField label="Country" htmlFor="country" error={fieldErrors?.country?.[0]}>
          <Input id="country" name="country" defaultValue={destination?.country ?? "India"} />
        </FormField>
      </div>

      <FormField
        label="Slug"
        htmlFor="slug"
        hint="Optional — derived from the name if left blank."
        error={fieldErrors?.slug?.[0]}
      >
        <Input
          id="slug"
          name="slug"
          defaultValue={destination?.slug}
          placeholder="auto-generated"
        />
      </FormField>

      <FormField label="Description" htmlFor="description" error={fieldErrors?.description?.[0]}>
        <Textarea
          id="description"
          name="description"
          defaultValue={destination?.description ?? ""}
          placeholder="Short internal description (optional)"
          rows={3}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={destination?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {destination ? "Save changes" : "Create destination"}
        </SubmitButton>
      </div>
    </form>
  );
}
