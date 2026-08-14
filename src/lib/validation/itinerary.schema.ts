import { z } from "zod";
import { MEAL_TYPES, SEGMENT_TYPES, TRANSPORT_MODES } from "@/domain/shared/enums";

/** A single itinerary day (segments are managed separately). */
export const itineraryDayInputSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  summary: z.string().trim().max(1000).optional().or(z.literal("")),
  fromDestinationId: z.string().min(1).optional().or(z.literal("")),
  toDestinationId: z.string().min(1).optional().or(z.literal("")),
});
export type ItineraryDayInput = z.infer<typeof itineraryDayInputSchema>;

export function parseItineraryDayForm(formData: FormData) {
  return itineraryDayInputSchema.safeParse({
    title: formData.get("title") ?? "",
    summary: formData.get("summary") ?? "",
    fromDestinationId: formData.get("fromDestinationId") ?? "",
    toDestinationId: formData.get("toDestinationId") ?? "",
  });
}

/** A single ordered segment within a day. transportMode/mealType are optional
 * enrichments meaningful for transfer/meal segments respectively. */
export const itinerarySegmentInputSchema = z.object({
  type: z.enum(SEGMENT_TYPES),
  title: z.string().trim().min(2, "Title is required").max(200),
  detail: z.string().trim().max(1000).optional().or(z.literal("")),
  transportMode: z.enum(TRANSPORT_MODES).optional().or(z.literal("")),
  mealType: z.enum(MEAL_TYPES).optional().or(z.literal("")),
});
export type ItinerarySegmentInput = z.infer<typeof itinerarySegmentInputSchema>;

export function parseItinerarySegmentForm(formData: FormData) {
  return itinerarySegmentInputSchema.safeParse({
    type: (formData.get("type") as string) || "note",
    title: formData.get("title") ?? "",
    detail: formData.get("detail") ?? "",
    transportMode: (formData.get("transportMode") as string) || "",
    mealType: (formData.get("mealType") as string) || "",
  });
}
