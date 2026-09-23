import { z } from "zod";

/**
 * Trip customization edits. Money arrives in RUPEES from the form and is
 * converted to integer paise here, at the boundary — never stored as a float.
 *
 * Override units are limited to what the public checkout can compute without
 * room/vehicle allocation (see domain/public-catalog/customization.ts).
 */
export const OVERRIDE_UNITS = ["per_person", "fixed", "per_group"] as const;

const MAX_RUPEES = 10_000_000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null))
    .nullable();

export const priceOverrideSchema = z
  .object({
    amountRupees: z
      .number({ invalid_type_error: "Enter a price." })
      .finite()
      .min(0, "Price cannot be negative.")
      .max(MAX_RUPEES, "Price is unrealistically high.")
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "At most 2 decimal places."),
    unit: z.enum(OVERRIDE_UNITS),
  })
  .transform((v) => ({ amountMinor: Math.round(v.amountRupees * 100), unit: v.unit }));

export const customizationPatchSchema = z
  .object({
    sortOrder: z.number().int().min(0).max(9999).optional(),
    isDefault: z.boolean().optional(),
    exclusiveGroup: optionalText(40)
      .refine((v) => v === null || /^[a-z0-9-]+$/.test(v), "Use lowercase letters, digits and dashes.")
      .optional(),
    descriptionOverride: optionalText(500).optional(),
    priceOverride: priceOverrideSchema.nullable().optional(),
  })
  .strict();

export type CustomizationPatchInput = z.input<typeof customizationPatchSchema>;
