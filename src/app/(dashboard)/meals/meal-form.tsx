"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import type { MealDetailDTO } from "@/types/master-data";
import { MEAL_PLANS, MEAL_TYPES, humanizeEnum } from "@/domain/shared/enums";
import { createMealAction, updateMealAction } from "@/server/actions/meal.actions";
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

export function MealForm({
  meal,
  onDone,
}: {
  meal?: MealDetailDTO;
  onDone: () => void;
}) {
  const router = useRouter();
  const action = meal ? updateMealAction.bind(null, meal.id) : createMealAction;
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      if (meal) onDone();
      else router.push(`/meals/${state.data.id}`);
    }
  }, [state, meal, onDone, router]);

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
          defaultValue={meal?.name}
          placeholder="e.g. MAP Plan (Breakfast + Dinner)"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Meal type" htmlFor="mealType" required error={fieldErrors?.mealType?.[0]}>
          <Select name="mealType" defaultValue={meal?.mealType ?? "dinner"}>
            <SelectTrigger id="mealType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {humanizeEnum(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Meal plan" htmlFor="plan" required error={fieldErrors?.plan?.[0]}>
          <Select name="plan" defaultValue={meal?.plan ?? "MAP"}>
            <SelectTrigger id="plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_PLANS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === "custom" ? "Custom" : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="active" name="active" defaultChecked={meal?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <SubmitButton pendingText="Saving…">{meal ? "Save changes" : "Create meal"}</SubmitButton>
      </div>
    </form>
  );
}
