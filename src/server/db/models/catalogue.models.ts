import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import {
  ACCOMMODATION_CATEGORIES,
  ACTIVITY_TYPES,
  MEAL_PLANS,
  MEAL_TYPES,
  ROOM_TYPES,
  TRANSPORT_MODES,
} from "@/domain/shared/enums";
import { baseModelOptions, GeoRefSchema, PriceSpecSchema } from "./shared";

// --- Destination ---------------------------------------------------------
const DestinationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    region: { type: String },
    country: { type: String, required: true, default: "India" },
    description: { type: String },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// --- Trip (with embedded structured itinerary) ---------------------------
const ItineraryDaySchema = new Schema(
  {
    dayNumber: { type: Number, required: true },
    title: { type: String, required: true },
    from: { type: GeoRefSchema, required: false },
    to: { type: GeoRefSchema, required: false },
    summary: { type: String },
    activityIds: [{ type: Schema.Types.ObjectId, ref: "Activity" }],
    includedMeals: [{ type: String, enum: MEAL_TYPES }],
    transportModes: [{ type: String, enum: TRANSPORT_MODES }],
    notes: { type: String },
  },
  { _id: false },
);

const TripSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String },
    destinationIds: [{ type: Schema.Types.ObjectId, ref: "Destination" }],
    durationDays: { type: Number, required: true, min: 1 },
    durationNights: { type: Number, required: true, min: 0 },
    itinerary: { type: [ItineraryDaySchema], default: [] },
    defaultInclusions: { type: [String], default: [] },
    defaultExclusions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// --- Accommodation -------------------------------------------------------
const RoomOptionSchema = new Schema(
  {
    roomType: { type: String, required: true, enum: ROOM_TYPES },
    category: { type: String, required: true, enum: ACCOMMODATION_CATEGORIES },
    price: { type: PriceSpecSchema, required: true },
  },
  { _id: false },
);

const AccommodationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    location: { type: GeoRefSchema, required: true },
    category: { type: String, required: true, enum: ACCOMMODATION_CATEGORIES },
    starRating: { type: Number, min: 0, max: 5 },
    roomOptions: { type: [RoomOptionSchema], default: [] },
    mealPlansOffered: [{ type: String, enum: MEAL_PLANS }],
    amenities: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// --- Transportation ------------------------------------------------------
const TransportationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mode: { type: String, required: true, enum: TRANSPORT_MODES, index: true },
    capacity: { type: Number, required: true, min: 1 },
    route: {
      type: new Schema(
        { from: { type: GeoRefSchema }, to: { type: GeoRefSchema } },
        { _id: false },
      ),
      required: false,
    },
    price: { type: PriceSpecSchema, required: true },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// --- Activity ------------------------------------------------------------
const ActivitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, required: true, enum: ACTIVITY_TYPES },
    location: { type: GeoRefSchema, required: false },
    durationMinutes: { type: Number },
    price: { type: PriceSpecSchema, required: true },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// --- Meal ----------------------------------------------------------------
const MealSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    mealType: { type: String, required: true, enum: MEAL_TYPES },
    plan: { type: String, required: true, enum: MEAL_PLANS },
    price: { type: PriceSpecSchema, required: true },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// --- Addon ---------------------------------------------------------------
const AddonSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: PriceSpecSchema, required: true },
    active: { type: Boolean, default: true },
  },
  baseModelOptions,
);

// Inferred document types keep the models strongly typed for repositories.
type DestinationDoc = InferSchemaType<typeof DestinationSchema>;
type TripDoc = InferSchemaType<typeof TripSchema>;
type AccommodationDoc = InferSchemaType<typeof AccommodationSchema>;
type TransportationDoc = InferSchemaType<typeof TransportationSchema>;
type ActivityDoc = InferSchemaType<typeof ActivitySchema>;
type MealDoc = InferSchemaType<typeof MealSchema>;
type AddonDoc = InferSchemaType<typeof AddonSchema>;

// Guarded model factory for Next hot-reload safety (avoid re-compiling models).
export const DestinationModel: Model<DestinationDoc> =
  (models.Destination as Model<DestinationDoc>) ??
  model<DestinationDoc>("Destination", DestinationSchema);
export const TripModel: Model<TripDoc> =
  (models.Trip as Model<TripDoc>) ?? model<TripDoc>("Trip", TripSchema);
export const AccommodationModel: Model<AccommodationDoc> =
  (models.Accommodation as Model<AccommodationDoc>) ??
  model<AccommodationDoc>("Accommodation", AccommodationSchema);
export const TransportationModel: Model<TransportationDoc> =
  (models.Transportation as Model<TransportationDoc>) ??
  model<TransportationDoc>("Transportation", TransportationSchema);
export const ActivityModel: Model<ActivityDoc> =
  (models.Activity as Model<ActivityDoc>) ?? model<ActivityDoc>("Activity", ActivitySchema);
export const MealModel: Model<MealDoc> =
  (models.Meal as Model<MealDoc>) ?? model<MealDoc>("Meal", MealSchema);
export const AddonModel: Model<AddonDoc> =
  (models.Addon as Model<AddonDoc>) ?? model<AddonDoc>("Addon", AddonSchema);
