import { z } from "zod";
import { TRANSPORT_MODES } from "@/domain/shared/enums";

/**
 * Transportation validation. Capacity is structured numeric data (Sedan 4, SUV 6,
 * Tempo 12, Bus 40) that the future pricing engine reads — never hard-coded in a
 * component. Route endpoints are optional (some transport is point-agnostic).
 */
export const transportationInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  mode: z.enum(TRANSPORT_MODES),
  provider: z.string().trim().max(160).optional().or(z.literal("")),
  vehicleType: z.string().trim().max(120).optional().or(z.literal("")),
  capacity: z.coerce
    .number({ invalid_type_error: "Enter a capacity" })
    .int("Whole seats only")
    .min(1, "Capacity must be at least 1")
    .max(200, "Capacity is too large"),
  routeFrom: z.string().trim().max(160).optional().or(z.literal("")),
  routeTo: z.string().trim().max(160).optional().or(z.literal("")),
  active: z.boolean().default(true),
});
export type TransportationInput = z.infer<typeof transportationInputSchema>;

export function parseTransportationForm(formData: FormData) {
  return transportationInputSchema.safeParse({
    name: formData.get("name") ?? "",
    mode: (formData.get("mode") as string) || "",
    provider: formData.get("provider") ?? "",
    vehicleType: formData.get("vehicleType") ?? "",
    capacity: formData.get("capacity") ?? "",
    routeFrom: formData.get("routeFrom") ?? "",
    routeTo: formData.get("routeTo") ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}
