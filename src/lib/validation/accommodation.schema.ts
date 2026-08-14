import { z } from "zod";
import {
  ACCOMMODATION_CATEGORIES,
  ROOM_TYPES,
  ROOM_TYPE_CAPACITY,
} from "@/domain/shared/enums";

/**
 * Accommodation (property) + RoomType validation. Server-authoritative; the
 * client reuses these schemas for inline hints only.
 */
export const accommodationInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  destinationId: z.string().min(1, "Choose a destination"),
  category: z.enum(ACCOMMODATION_CATEGORIES),
  starRating: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).max(5).optional(),
  ),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Amenities arrive as a comma-separated string; normalised to a clean array.
  amenities: z
    .string()
    .trim()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  active: z.boolean().default(true),
});
export type AccommodationInput = z.infer<typeof accommodationInputSchema>;

export function parseAccommodationForm(formData: FormData) {
  return accommodationInputSchema.safeParse({
    name: formData.get("name") ?? "",
    destinationId: (formData.get("destinationId") as string) || "",
    category: (formData.get("category") as string) || "",
    starRating: formData.get("starRating") ?? "",
    description: formData.get("description") ?? "",
    amenities: (formData.get("amenities") as string) ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

/** A room type belongs to an accommodation; occupancy comes from the shared enum. */
export const roomTypeInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    occupancy: z.enum(ROOM_TYPES),
    category: z.enum(ACCOMMODATION_CATEGORIES),
    maxOccupancy: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : v),
      z.coerce.number().int().min(1).max(20).optional(),
    ),
    active: z.boolean().default(true),
  })
  // maxOccupancy, when supplied, must be at least the base sleeping capacity of
  // the chosen occupancy (e.g. a "triple" cannot cap at 2).
  .refine(
    (d) => d.maxOccupancy === undefined || d.maxOccupancy >= ROOM_TYPE_CAPACITY[d.occupancy],
    { message: "Max occupancy is below the base capacity for this occupancy", path: ["maxOccupancy"] },
  );
export type RoomTypeInput = z.infer<typeof roomTypeInputSchema>;

export function parseRoomTypeForm(formData: FormData) {
  return roomTypeInputSchema.safeParse({
    name: formData.get("name") ?? "",
    occupancy: (formData.get("occupancy") as string) || "",
    category: (formData.get("category") as string) || "",
    maxOccupancy: formData.get("maxOccupancy") ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
