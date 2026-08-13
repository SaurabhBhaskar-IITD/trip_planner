import { Schema } from "mongoose";
import { PRICING_UNITS, SEASONS } from "@/domain/shared/enums";

/**
 * Reusable sub-schemas shared across models.
 * `_id: false` on embedded schemas keeps documents lean and stable.
 */

/** Money stored as integer minor units — mirrors the domain Money value object. */
export const MoneySchema = new Schema(
  {
    minorUnits: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "Money.minorUnits must be an integer (paise).",
      },
    },
    currency: { type: String, required: true, default: "INR", enum: ["INR"] },
  },
  { _id: false },
);

/** Master-data price with validity / season / unit metadata. */
export const PriceSpecSchema = new Schema(
  {
    amount: { type: MoneySchema, required: true },
    unit: { type: String, required: true, enum: PRICING_UNITS },
    // INTERNAL — never projected onto public DTOs.
    supplierCost: { type: MoneySchema, required: false },
    validFrom: { type: Date, required: false },
    validUntil: { type: Date, required: false },
    season: { type: String, enum: SEASONS, required: false },
    minPax: { type: Number, required: false },
    maxPax: { type: Number, required: false },
    notes: { type: String, required: false },
  },
  { _id: false },
);

export const GeoRefSchema = new Schema(
  {
    destinationId: { type: Schema.Types.ObjectId, ref: "Destination", required: false },
    name: { type: String, required: true },
    region: { type: String, required: false },
  },
  { _id: false },
);

/** Common options applied to top-level models: timestamps + clean JSON. */
export const baseModelOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
} as const;
