import { z } from "zod";
import { ACTIVITY_TYPES } from "@/domain/shared/enums";

/**
 * Activity validation. Destination is optional (some activities are generic /
 * multi-location). Duration is captured in minutes as structured data.
 */
export const activityInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  destinationId: z.string().min(1).optional().or(z.literal("")),
  type: z.enum(ACTIVITY_TYPES),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  durationMinutes: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int("Whole minutes only").min(1).max(10080).optional(),
  ),
  active: z.boolean().default(true),
});
export type ActivityInput = z.infer<typeof activityInputSchema>;

export function parseActivityForm(formData: FormData) {
  // The destination Select uses a "none" sentinel (Radix Select forbids empty
  // option values); normalise it to "" so the schema treats it as unset.
  const rawDestination = (formData.get("destinationId") as string) || "";
  return activityInputSchema.safeParse({
    name: formData.get("name") ?? "",
    destinationId: rawDestination === "none" ? "" : rawDestination,
    type: (formData.get("type") as string) || "",
    description: formData.get("description") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
