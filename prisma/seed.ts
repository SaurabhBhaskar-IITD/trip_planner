/**
 * Prisma development seed.
 *
 * Creates ONLY the minimum data needed to sign in and click around:
 *   - one admin user
 *   - a couple of clearly-labelled sample destinations
 *
 * It deliberately creates NO pricing and NO fake production data — real trips,
 * accommodations and prices are entered through the app in later phases.
 *
 * Run with:  npm run seed
 * Admin credentials can be overridden via env:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEV_LABEL = "[DEV SAMPLE] created by prisma/seed.ts — not production data";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env before seeding.");
  }

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@trip-le.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#12345";
  const name = process.env.SEED_ADMIN_NAME ?? "Trip Le Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: "admin", active: true },
    create: { email, name, passwordHash, role: "admin", active: true },
  });
  console.log(`✔ Admin user ready: ${admin.email} (role: ${admin.role})`);

  // Minimal reusable destinations so trips/accommodations have something to link
  // to during Phase 2 development. Clearly labelled as dev samples.
  const destinations = [
    { name: "Shimla", slug: "shimla", region: "Himachal Pradesh" },
    { name: "Manali", slug: "manali", region: "Himachal Pradesh" },
  ];

  for (const d of destinations) {
    await prisma.destination.upsert({
      where: { slug: d.slug },
      update: { name: d.name, region: d.region },
      create: { ...d, country: "India", description: DEV_LABEL, active: true },
    });
  }
  console.log(`✔ Seeded ${destinations.length} sample destinations (dev-labelled)`);
  console.log("Done. You can now sign in with the admin credentials above.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
