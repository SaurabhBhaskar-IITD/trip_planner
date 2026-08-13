import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { COMPONENT_KINDS, PRICING_UNITS, QUOTE_STATUSES, ROOM_TYPES } from "@/domain/shared/enums";
import { baseModelOptions, MoneySchema } from "./shared";

/**
 * Quote persistence — the historical-accuracy centerpiece.
 *
 * Item snapshots and totals are EMBEDDED (not referenced) so a quote's numbers
 * are frozen at creation and cannot drift when master data changes later. Each
 * edit appends a new QuoteVersion rather than mutating the previous one, giving
 * full price-change history.
 */

const QuoteItemSnapshotSchema = new Schema(
  {
    sourceId: { type: Schema.Types.ObjectId, required: false },
    kind: { type: String, required: true, enum: COMPONENT_KINDS },
    label: { type: String, required: true },
    unit: { type: String, required: true, enum: PRICING_UNITS },
    unitPrice: { type: MoneySchema, required: true },
    quantity: { type: Number, required: true },
    lineTotal: { type: MoneySchema, required: true },
    // INTERNAL — supplier cost & margin frozen at snapshot time.
    internal: {
      type: new Schema(
        {
          supplierCost: { type: MoneySchema, required: true },
          margin: { type: MoneySchema, required: true },
          marginPercentage: { type: Number, required: true },
        },
        { _id: false },
      ),
      required: false,
    },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const RoomSelectionSchema = new Schema(
  {
    roomType: { type: String, enum: ROOM_TYPES, required: true },
    count: { type: Number, required: true },
  },
  { _id: false },
);

const TotalsInternalSchema = new Schema(
  {
    supplierCostTotal: { type: MoneySchema, required: true },
    marginTotal: { type: MoneySchema, required: true },
    marginPercentage: { type: Number, required: true },
  },
  { _id: false },
);

const QuoteTotalsSchema = new Schema(
  {
    subtotal: { type: MoneySchema, required: true },
    discountTotal: { type: MoneySchema, required: true },
    taxTotal: { type: MoneySchema, required: true },
    grandTotal: { type: MoneySchema, required: true },
    internal: { type: TotalsInternalSchema, required: false },
  },
  { _id: false },
);

const QuoteSelectionsSchema = new Schema(
  {
    travelStartDate: { type: Date, required: true },
    travelEndDate: { type: Date, required: true },
    travellerCount: { type: Number, required: true },
    rooms: { type: [RoomSelectionSchema], default: [] },
    accommodationIds: [{ type: Schema.Types.ObjectId, ref: "Accommodation" }],
    transportIds: [{ type: Schema.Types.ObjectId, ref: "Transportation" }],
    activityIds: [{ type: Schema.Types.ObjectId, ref: "Activity" }],
    mealIds: [{ type: Schema.Types.ObjectId, ref: "Meal" }],
    addonIds: [{ type: Schema.Types.ObjectId, ref: "Addon" }],
    appliedRuleIds: [{ type: Schema.Types.ObjectId, ref: "PricingRule" }],
    customServices: {
      type: [new Schema({ label: String, price: MoneySchema }, { _id: false })],
      default: [],
    },
  },
  { _id: false },
);

const QuoteVersionSchema = new Schema(
  {
    version: { type: Number, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
    selections: { type: QuoteSelectionsSchema, required: true },
    items: { type: [QuoteItemSnapshotSchema], default: [] },
    totals: { type: QuoteTotalsSchema, required: true },
    pricingEngineVersion: { type: String, required: true },
  },
  { _id: false },
);

const QuoteSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    tripSnapshotName: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    status: { type: String, required: true, enum: QUOTE_STATUSES, default: "draft", index: true },
    currentVersion: { type: Number, required: true, default: 1 },
    versions: { type: [QuoteVersionSchema], default: [] },
  },
  baseModelOptions,
);

type QuoteDoc = InferSchemaType<typeof QuoteSchema>;

export const QuoteModel: Model<QuoteDoc> =
  (models.Quote as Model<QuoteDoc>) ?? model<QuoteDoc>("Quote", QuoteSchema);
