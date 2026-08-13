import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { baseModelOptions } from "./shared";

const TravellerSchema = new Schema(
  {
    fullName: { type: String, required: true },
    age: { type: Number },
    idType: { type: String },
    idNumber: { type: String },
  },
  { _id: false },
);

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    city: { type: String },
    travellers: { type: [TravellerSchema], default: [] },
    notes: { type: String },
  },
  baseModelOptions,
);

type CustomerDoc = InferSchemaType<typeof CustomerSchema>;

export const CustomerModel: Model<CustomerDoc> =
  (models.Customer as Model<CustomerDoc>) ?? model<CustomerDoc>("Customer", CustomerSchema);
