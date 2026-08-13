/**
 * Minimal seed script — creates an initial admin user so the team can sign in.
 *
 * Usage (requires .env.local with MONGODB_URI):
 *   node --env-file=.env.local scripts/seed.mjs "admin@trip-le.com" "StrongPass#123" "Admin User"
 *
 * It is intentionally dependency-light (only mongoose + bcryptjs, both already
 * installed) and uses no path aliases, so plain Node can run it.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const [, , emailArg, passwordArg, nameArg] = process.argv;
const email = (emailArg ?? "admin@trip-le.com").toLowerCase();
const password = passwordArg ?? "ChangeMe#12345";
const name = nameArg ?? "Trip Le Admin";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local and re-run.");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: String,
    active: Boolean,
  },
  { timestamps: true, collection: "users" },
);

const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

async function main() {
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME ?? "trip_le_planner" });
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await User.findOneAndUpdate(
    { email },
    { name, email, passwordHash, role: "admin", active: true },
    { upsert: true, new: true },
  );

  console.log(`✔ Seeded admin user: ${result.email} (role: ${result.role})`);
  console.log("  You can now sign in with the email/password provided.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
