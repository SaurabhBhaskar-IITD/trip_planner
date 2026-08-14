"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { AccommodationDetailDTO, DestinationOption } from "@/types/master-data";
import { ACCOMMODATION_CATEGORIES, humanizeEnum } from "@/domain/shared/enums";
import {
  createAccommodationAction,
  updateAccommodationAction,
} from "@/server/actions/accommodation.actions";
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

export function AccommodationForm({
  accommodation,
  destinationOptions,
  onDone,
}: {
  accommodation?: AccommodationDetailDTO;
  destinationOptions: DestinationOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const action = accommodation
    ? updateAccommodationAction.bind(null, accommodation.id)
    : createAccommodationAction;
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      // New properties open their detail workspace so room types can be added.
      if (accommodation) onDone();
      else router.push(`/accommodations/${state.data.id}`);
    }
  }, [state, accommodation, onDone, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.ok && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField label="Property name" htmlFor="name" required error={fieldErrors?.name?.[0]}>
        <Input
          id="name"
          name="name"
          defaultValue={accommodation?.name}
          placeholder="e.g. Hotel Snow Valley"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Destination"
          htmlFor="destinationId"
          required
          error={fieldErrors?.destinationId?.[0]}
        >
          <Select name="destinationId" defaultValue={accommodation?.destinationId}>
            <SelectTrigger id="destinationId">
              <SelectValue placeholder="Choose a destination" />
            </SelectTrigger>
            <SelectContent>
              {destinationOptions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Category" htmlFor="category" required error={fieldErrors?.category?.[0]}>
          <Select name="category" defaultValue={accommodation?.category ?? "standard"}>
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
        label="Star rating"
        htmlFor="starRating"
        hint="Optional (1–5)."
        error={fieldErrors?.starRating?.[0]}
      >
        <Input
          id="starRating"
          name="starRating"
          type="number"
          min={1}
          max={5}
          defaultValue={accommodation?.starRating ?? ""}
          placeholder="—"
          className="sm:w-32"
        />
      </FormField>

      <FormField
        label="Amenities"
        htmlFor="amenities"
        hint="Comma-separated, e.g. WiFi, Parking, Restaurant."
        error={fieldErrors?.amenities?.[0]}
      >
        <Input
          id="amenities"
          name="amenities"
          defaultValue={accommodation?.amenities.join(", ") ?? ""}
          placeholder="WiFi, Parking, Restaurant"
        />
      </FormField>

      <FormField label="Description" htmlFor="description" error={fieldErrors?.description?.[0]}>
        <Textarea
          id="description"
          name="description"
          defaultValue={accommodation?.description ?? ""}
          placeholder="Short internal description (optional)"
          rows={3}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={accommodation?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {accommodation ? "Save changes" : "Create property"}
        </SubmitButton>
      </div>
    </form>
  );
}
