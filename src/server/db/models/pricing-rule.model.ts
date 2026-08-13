import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { COMPONENT_KINDS } from "@/domain/shared/enums";
import { baseModelOptions, MoneySchema } from "./shared";

const RuleConditionSchema = new Schema(
  {
    field: {
      type: String,
      required: true,
      enum: [
        "travellerCount",
        "roomOccupancy",
        "accommodationCategory",
        "transportMode",
        "activityType",
        "mealPlan",
        "travelMonth",
      ],
    },
    operator: { type: String, required: true, enum: ["eq", "neq", "gte", "lte", "gt", "lt", "in"] },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const RuleEffectSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "add_fixed",
        "add_per_person",
        "add_per_person_per_night",
        "discount_percentage",
        "surcharge_percentage",
        "replace_component",
      ],
    },
    amount: { type: MoneySchema, required: false },
    percent: { type: Number, required: false },
    targetKind: { type: String, enum: COMPONENT_KINDS, required: false },
    replacementRef: { type: Schema.Types.ObjectId, required: false },
    label: { type: String, required: true },
  },
  { _id: false },
);

const PricingRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    priority: { type: Number, required: true, default: 100 },
    conditions: { type: [RuleConditionSchema], default: [] },
    effect: { type: RuleEffectSchema, required: true },
    requiresApproval: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

type PricingRuleDoc = InferSchemaType<typeof PricingRuleSchema>;

export const PricingRuleModel: Model<PricingRuleDoc> =
  (models.PricingRule as Model<PricingRuleDoc>) ??
  model<PricingRuleDoc>("PricingRule", PricingRuleSchema);
