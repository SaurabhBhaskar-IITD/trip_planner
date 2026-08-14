"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { DestinationOption, TripDetailDTO } from "@/types/master-data";
import { TRIP_STATUSES, humanizeEnum } from "@/domain/shared/enums";
import { createTripAction, updateTripAction } from "@/server/actions/trip.actions";
import type { ActionResult } from "@/server/actions/action-result";
import { FormField } from "@/components/common/form-field";
import { SubmitButton } from "@/components/common/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TripDestinationPicker } from "./trip-destination-picker";

export function TripForm({
  trip,
  destinationOptions,
}: {
  trip?: TripDetailDTO;
  destinationOptions: DestinationOption[];
}) {
  const router = useRouter();
  const action = trip ? updateTripAction.bind(null, trip.id) : createTripAction;
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.push(`/trips/${state.data.id}`);
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && !state.fieldErrors ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Trip details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Name" htmlFor="name" required error={fieldErrors?.name?.[0]}>
              <Input
                id="name"
                name="name"
                defaultValue={trip?.name}
                placeholder="e.g. Himachal Explorer"
                required
                autoFocus
              />
            </FormField>

            <FormField
              label="Slug"
              htmlFor="slug"
              hint="Optional — derived from the name if left blank."
              error={fieldErrors?.slug?.[0]}
            >
              <Input id="slug" name="slug" defaultValue={trip?.slug} placeholder="auto-generated" />
            </FormField>

            <FormField
              label="Short summary"
              htmlFor="summary"
              hint="One line shown in lists (max 300 chars)."
              error={fieldErrors?.summary?.[0]}
            >
              <Input
                id="summary"
                name="summary"
                defaultValue={trip?.summary ?? ""}
                placeholder="e.g. 7-day Himachal circuit"
              />
            </FormField>

            <FormField
              label="Full description"
              htmlFor="description"
              error={fieldErrors?.description?.[0]}
            >
              <Textarea
                id="description"
                name="description"
                defaultValue={trip?.description ?? ""}
                placeholder="Internal description of the trip product"
                rows={4}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Duration &amp; status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Days"
                  htmlFor="durationDays"
                  required
                  error={fieldErrors?.durationDays?.[0]}
                >
                  <Input
                    id="durationDays"
                    name="durationDays"
                    type="number"
                    min={1}
                    defaultValue={trip?.durationDays ?? 1}
                    required
                  />
                </FormField>
                <FormField
                  label="Nights"
                  htmlFor="durationNights"
                  error={fieldErrors?.durationNights?.[0]}
                >
                  <Input
                    id="durationNights"
                    name="durationNights"
                    type="number"
                    min={0}
                    defaultValue={trip?.durationNights ?? 0}
                  />
                </FormField>
              </div>

              <FormField label="Status" htmlFor="status" error={fieldErrors?.status?.[0]}>
                <Select name="status" defaultValue={trip?.status ?? "draft"}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIP_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {humanizeEnum(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Destinations</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="sr-only">Destinations</Label>
              <TripDestinationPicker
                options={destinationOptions}
                initialSelectedIds={trip?.destinations.map((d) => d.destinationId) ?? []}
              />
              {destinationOptions.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No active destinations yet. Create some under Destinations first.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <SubmitButton pendingText="Saving…">{trip ? "Save changes" : "Create trip"}</SubmitButton>
      </div>
    </form>
  );
}
