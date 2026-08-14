import { z } from "zod";
import { PRICING_UNITS, SEASONS } from "@/domain/shared/enums";
import { Money } from "@/domain/shared/money";

/**
 * Shared pricing validation — the single schema behind every module's price rows
 * (accommodation, transport, activity, meal, add-on). The server re-parses with
 * this on every mutation; the client uses it only for inline hints.
 *
 * Money is entered in MAJOR units (rupees) for humans and converted to integer
 * MINOR units (paise) via the Money value object — never floating-point math.
 * `supplierCost*` is INTERNAL and only ever persisted for callers holding
 * `pricing:viewInternal` (enforced in the action, not here).
 */

/** Empty string / undefined -> undefined; otherwise coerce to a Date. */
const optionalDate = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return undefined;
  return v;
}, z.coerce.date().optional());

/** Empty string / undefined -> undefined; otherwise coerce to a number. */
const optionalNumber = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return undefined;
  return v;
}, z.coerce.number().optional());

export const pricingInputSchema = z
  .object({
    // Accommodation prices belong to a RoomType; other kinds price the parent
    // directly. Required-ness for accommodation is enforced in the action.
    roomTypeId: z.string().min(1).optional().or(z.literal("")),
    amountMajor: z.coerce
      .number({ invalid_type_error: "Enter a valid amount" })
      .positive("Price must be greater than zero")
      .max(100_000_000, "Price is too large"),
    supplierCostMajor: optionalNumber.refine((v) => v === undefined || v >= 0, {
      message: "Supplier cost cannot be negative",
    }),
    unit: z.enum(PRICING_UNITS),
    season: z.enum(SEASONS).optional().or(z.literal("")),
    validFrom: optionalDate,
    validUntil: optionalDate,
    minPax: optionalNumber.refine((v) => v === undefined || (Number.isInteger(v) && v >= 1), {
      message: "Min pax must be a whole number ≥ 1",
    }),
    maxPax: optionalNumber.refine((v) => v === undefined || (Number.isInteger(v) && v >= 1), {
      message: "Max pax must be a whole number ≥ 1",
    }),
    active: z.boolean().default(true),
  })
  .refine(
    (d) => !(d.validFrom && d.validUntil) || d.validUntil.getTime() >= d.validFrom.getTime(),
    { message: "Valid-until must be on or after valid-from", path: ["validUntil"] },
  )
  .refine((d) => !(d.minPax && d.maxPax) || d.maxPax >= d.minPax, {
    message: "Max pax must be ≥ min pax",
    path: ["maxPax"],
  });

export type PricingInput = z.infer<typeof pricingInputSchema>;

/** Coerce raw FormData into the pricing input before validation. */
export function parsePricingForm(formData: FormData) {
  return pricingInputSchema.safeParse({
    roomTypeId: formData.get("roomTypeId") ?? "",
    amountMajor: formData.get("amountMajor") ?? "",
    supplierCostMajor: formData.get("supplierCostMajor") ?? "",
    unit: (formData.get("unit") as string) || "",
    season: (formData.get("season") as string) || "",
    validFrom: formData.get("validFrom") ?? "",
    validUntil: formData.get("validUntil") ?? "",
    minPax: formData.get("minPax") ?? "",
    maxPax: formData.get("maxPax") ?? "",
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });
}

/**
 * The persisted shape a repository receives. Money is already in minor units and
 * supplier cost is stripped for callers without pricing:viewInternal.
 */
export interface PriceWriteInput {
  amountMinor: number;
  supplierCostMinor: number | null;
  unit: PricingInput["unit"];
  season: (typeof SEASONS)[number] | null;
  validFrom: Date | null;
  validUntil: Date | null;
  minPax: number | null;
  maxPax: number | null;
  active: boolean;
}

/**
 * Map validated form input to the repository write shape. Converts rupees→paise
 * with Money (integer-safe) and drops supplier cost unless the caller may set it.
 */
export function toPriceWriteInput(
  input: PricingInput,
  opts: { canWriteInternal: boolean },
): PriceWriteInput {
  return {
    amountMinor: Money.fromMajor(input.amountMajor).minorUnits,
    supplierCostMinor:
      opts.canWriteInternal && input.supplierCostMajor !== undefined
        ? Money.fromMajor(input.supplierCostMajor).minorUnits
        : null,
    unit: input.unit,
    season: input.season ? input.season : null,
    validFrom: input.validFrom ?? null,
    validUntil: input.validUntil ?? null,
    minPax: input.minPax ?? null,
    maxPax: input.maxPax ?? null,
    active: input.active,
  };
}
