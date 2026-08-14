"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { AddonDetailDTO } from "@/types/master-data";
import { createAddonAction, updateAddonAction } from "@/server/actions/addon.actions";
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

export function AddonForm({
  addon,
  onDone,
}: {
  addon?: AddonDetailDTO;
  onDone: () => void;
}) {
  const router = useRouter();
  const action = addon ? updateAddonAction.bind(null, addon.id) : createAddonAction;
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      if (addon) onDone();
      else router.push(`/addons/${state.data.id}`);
    }
  }, [state, addon, onDone, router]);

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
          defaultValue={addon?.name}
          placeholder="e.g. Airport Transfer"
          required
          autoFocus
        />
      </FormField>

      <FormField label="Description" htmlFor="description" error={fieldErrors?.description?.[0]}>
        <Textarea
          id="description"
          name="description"
          defaultValue={addon?.description ?? ""}
          placeholder="Short internal description (optional)"
          rows={3}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={addon?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">
          {addon ? "Save changes" : "Create add-on"}
        </SubmitButton>
      </div>
    </form>
  );
}
