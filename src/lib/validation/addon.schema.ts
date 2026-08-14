import { z } from "zod";

/**
 * Add-on validation. Add-ons (Airport Transfer, Extra Night, Guide, Insurance,
 * …) are the simplest catalogue item: a name, optional description and pricing.
 */
export const addonInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  active: z.boolean().default(true),
});
export type AddonInput = z.infer<typeof addonInputSchema>;

export function parseAddonForm(formData: FormData) {
  return addonInputSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
