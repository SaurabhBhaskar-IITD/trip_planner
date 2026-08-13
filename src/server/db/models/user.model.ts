import { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { ROLES } from "@/config/roles";
import { baseModelOptions } from "./shared";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    /** bcrypt hash — never selected by default, never returned to the client. */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ROLES, default: "sales" },
    active: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date, required: false },
  },
  baseModelOptions,
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: unknown };

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>("User", UserSchema);
