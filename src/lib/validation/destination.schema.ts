import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/utils/slug";

/**
 * Destination validation. Used by BOTH client (for inline hints) and server (the
 * authoritative check). The server never trusts the client — every action
 * re-parses with these schemas.
 */
export const destinationInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  // Optional on input — the server derives it from the name when blank.
  slug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only")
    .max(140)
    .optional()
    .or(z.literal("")),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(80).default("India"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export type DestinationInput = z.infer<typeof destinationInputSchema>;

/** Coerce raw FormData (all strings) into typed input before validation. */
export function parseDestinationForm(formData: FormData) {
  return destinationInputSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    region: formData.get("region") ?? "",
    country: (formData.get("country") as string) || "India",
    description: formData.get("description") ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
