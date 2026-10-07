import { z } from "zod";

/**
 * Trip customization edits. Money arrives in RUPEES from the form and is
 * converted to integer paise here, at the boundary — never stored as a float.
 *
 * Override units are the ones the public checkout can multiply out from
 * travellers, the trip's nights and room occupancy (see
 * domain/public-catalog/customization.ts).
 */
export const OVERRIDE_UNITS = [
  "per_person",
  "fixed",
  "per_group",
  "per_person_per_night",
  "per_room",
  "per_room_per_night",
  "per_night",
] as const;

const MAX_RUPEES = 10_000_000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null))
    .nullable();

const rupees = z
  .number({ invalid_type_error: "Enter a price." })
  .finite()
  .min(0, "Price cannot be negative.")
  .max(MAX_RUPEES, "Price is unrealistically high.")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "At most 2 decimal places.");

export const priceOverrideSchema = z
  .object({ amountRupees: rupees, unit: z.enum(OVERRIDE_UNITS) })
  .transform((v) => ({ amountMinor: Math.round(v.amountRupees * 100), unit: v.unit }));

export const customizationPatchSchema = z
  .object({
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isDefault: z.boolean().optional(),
    isRecommended: z.boolean().optional(),
    priceOnRequest: z.boolean().optional(),
    availabilityNote: optionalText(200).optional(),
    roomOccupancy: z.number().int().min(1, "At least 1 traveller per room.").max(12).nullable().optional(),
    exclusiveGroup: optionalText(40)
      .refine((v) => v === null || /^[a-z0-9-]+$/.test(v), "Use lowercase letters, digits and dashes.")
      .optional(),
    descriptionOverride: optionalText(500).optional(),
    /** INTERNAL notes. */
    note: optionalText(2000).optional(),
    priceOverride: priceOverrideSchema.nullable().optional(),
    /** INTERNAL supplier cost in rupees, same unit as the trip price. */
    supplierCostRupees: rupees
      .nullable()
      .optional()
      .transform((v) => (v == null ? v : Math.round(v * 100))),
  })
  .strict();

export type CustomizationPatchInput = z.input<typeof customizationPatchSchema>;
