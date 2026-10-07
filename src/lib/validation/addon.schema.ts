import { z } from "zod";
import { ADDON_CATEGORIES } from "@/domain/shared/enums";

/**
 * Add-on validation. Add-ons (Airport Transfer, Extra Night, Guide, Insurance,
 * …) are the simplest catalogue item: a name, optional description and pricing.
 *
 * `category` decides whether an add-on can appear in the customer customization
 * flow on trip-le.com (only HOTEL_UPGRADE / TRAVEL_UPGRADE do). Empty = none.
 */
export const addonInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.enum(ADDON_CATEGORIES).nullable().default(null),
  active: z.boolean().default(true),
});
export type AddonInput = z.infer<typeof addonInputSchema>;

export function parseAddonForm(formData: FormData) {
  const category = formData.get("category");
  return addonInputSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    category: typeof category === "string" && category && category !== "__none__" ? category : null,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
