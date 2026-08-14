"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { TransportationDetailDTO } from "@/types/master-data";
import { TRANSPORT_MODES, humanizeEnum } from "@/domain/shared/enums";
import {
  createTransportationAction,
  updateTransportationAction,
} from "@/server/actions/transportation.actions";
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

export function TransportationForm({
  transportation,
  onDone,
}: {
  transportation?: TransportationDetailDTO;
  onDone: () => void;
}) {
  const router = useRouter();
  const action = transportation
    ? updateTransportationAction.bind(null, transportation.id)
    : createTransportationAction;
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      if (transportation) onDone();
      else router.push(`/transport/${state.data.id}`);
    }
  }, [state, transportation, onDone, router]);

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
          defaultValue={transportation?.name}
          placeholder="e.g. Tempo Traveller (12-seater)"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Mode" htmlFor="mode" required error={fieldErrors?.mode?.[0]}>
          <Select name="mode" defaultValue={transportation?.mode ?? "private_sedan"}>
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {humanizeEnum(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Capacity"
          htmlFor="capacity"
          required
          hint="Seats / pax. Read by the pricing engine — never hard-coded."
          error={fieldErrors?.capacity?.[0]}
        >
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            max={200}
            defaultValue={transportation?.capacity ?? ""}
            placeholder="e.g. 12"
            required
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Provider" htmlFor="provider" error={fieldErrors?.provider?.[0]}>
          <Input
            id="provider"
            name="provider"
            defaultValue={transportation?.provider ?? ""}
            placeholder="Optional operator name"
          />
        </FormField>
        <FormField label="Vehicle type" htmlFor="vehicleType" error={fieldErrors?.vehicleType?.[0]}>
          <Input
            id="vehicleType"
            name="vehicleType"
            defaultValue={transportation?.vehicleType ?? ""}
            placeholder="e.g. AC Deluxe"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Route from" htmlFor="routeFrom" error={fieldErrors?.routeFrom?.[0]}>
          <Input
            id="routeFrom"
            name="routeFrom"
            defaultValue={transportation?.routeFrom ?? ""}
            placeholder="e.g. Delhi"
          />
        </FormField>
        <FormField label="Route to" htmlFor="routeTo" error={fieldErrors?.routeTo?.[0]}>
          <Input
            id="routeTo"
            name="routeTo"
            defaultValue={transportation?.routeTo ?? ""}
            placeholder="e.g. Manali"
          />
        </FormField>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={transportation?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {transportation ? "Save changes" : "Create transport"}
        </SubmitButton>
      </div>
    </form>
  );
}
