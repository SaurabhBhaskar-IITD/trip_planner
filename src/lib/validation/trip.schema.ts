import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/utils/slug";
import { TRIP_STATUSES } from "@/domain/shared/enums";

/**
 * Trip validation (server-authoritative). Duration is captured as days + nights;
 * the relationship (nights typically days-1) is a business nicety, not enforced,
 * because some products legitimately differ.
 */
export const tripInputSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(160),
  slug: z
    .string()
    .trim()
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and hyphens only")
    .max(180)
    .optional()
    .or(z.literal("")),
  summary: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  durationDays: z.coerce.number().int("Whole days only").min(1, "At least 1 day").max(60),
  durationNights: z.coerce.number().int("Whole nights only").min(0).max(59),
  status: z.enum(TRIP_STATUSES).default("draft"),
  /** Ordered destination ids attached to the trip. */
  destinationIds: z.array(z.string().min(1)).default([]),
});

export type TripInput = z.infer<typeof tripInputSchema>;

export function parseTripForm(formData: FormData) {
  // Ordered destination ids arrive as a single comma-separated hidden field so
  // the order the operator arranged is preserved exactly.
  const orderedRaw = (formData.get("destinationIds") as string) || "";
  const destinationIds = orderedRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return tripInputSchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    summary: formData.get("summary") ?? "",
    description: formData.get("description") ?? "",
    durationDays: formData.get("durationDays") ?? "",
    durationNights: formData.get("durationNights") ?? "",
    status: (formData.get("status") as string) || "draft",
    destinationIds,
  });
}

export const tripStatusSchema = z.enum(TRIP_STATUSES);
