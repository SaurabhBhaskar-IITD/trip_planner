import { z } from "zod";
import { MEAL_PLANS, MEAL_TYPES } from "@/domain/shared/enums";

/**
 * Meal validation. Meal type (breakfast/lunch/dinner) and plan (EP/CP/MAP/AP/
 * custom) come from the shared domain enums — never re-defined in the UI.
 */
export const mealInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  mealType: z.enum(MEAL_TYPES),
  plan: z.enum(MEAL_PLANS),
  active: z.boolean().default(true),
});
export type MealInput = z.infer<typeof mealInputSchema>;

export function parseMealForm(formData: FormData) {
  return mealInputSchema.safeParse({
    name: formData.get("name") ?? "",
    mealType: (formData.get("mealType") as string) || "",
    plan: (formData.get("plan") as string) || "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
