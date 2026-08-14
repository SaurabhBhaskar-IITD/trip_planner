/**
 * Prisma development seed — small, realistic, clearly-labelled dev dataset.
 *
 * Creates: an admin user, reusable destinations, two trips with ordered
 * destinations + multi-day itineraries, and a light catalogue of hotels (room
 * types + prices), transport, activities, meals and add-ons so later modules and
 * the future pricing engine have data to work with.
 *
 * This is DEVELOPMENT data. Every catalogue record is tagged in its description
 * so it can never be mistaken for real production inventory. Idempotent: reruns
 * upsert by natural keys and skip catalogue creation when data already exists.
 *
 * Run with:  npm run seed
 * Admin credentials override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEV = "[DEV SAMPLE — not production data]";
/** Rupees → integer minor units (paise) as BigInt. */
const inr = (rupees: number) => BigInt(Math.round(rupees * 100));

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env before seeding.");
  }

  // --- Admin user --------------------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@trip-le.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#12345";
  const name = process.env.SEED_ADMIN_NAME ?? "Trip Le Admin";
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: "admin", active: true },
    create: { email, name, passwordHash, role: "admin", active: true },
  });
  console.log(`✔ Admin user: ${admin.email}`);

  // --- Destinations (reusable) ------------------------------------------
  const destData = [
    { slug: "delhi", name: "Delhi", region: "Delhi NCR" },
    { slug: "shimla", name: "Shimla", region: "Himachal Pradesh" },
    { slug: "manali", name: "Manali", region: "Himachal Pradesh" },
    { slug: "kasol", name: "Kasol", region: "Himachal Pradesh" },
  ];
  const destinations: Record<string, string> = {};
  for (const d of destData) {
    const row = await prisma.destination.upsert({
      where: { slug: d.slug },
      update: { name: d.name, region: d.region },
      create: { ...d, country: "India", description: DEV, active: true },
    });
    destinations[d.slug] = row.id;
  }
  console.log(`✔ ${destData.length} destinations`);

  // --- Trips with ordered destinations + itineraries --------------------
  await upsertTrip({
    slug: "himachal-explorer",
    name: "Himachal Explorer",
    summary: "7-day Delhi–Shimla–Manali circuit",
    durationDays: 7,
    durationNights: 6,
    status: "active",
    destinationSlugs: ["delhi", "shimla", "manali"],
    destinations,
    days: [
      {
        title: "Arrival in Shimla",
        from: "delhi",
        to: "shimla",
        segments: [
          { type: "transfer", title: "Delhi → Shimla", transportMode: "private_sedan" },
          { type: "accommodation", title: "Hotel check-in" },
          { type: "sightseeing", title: "Mall Road & The Ridge" },
          { type: "meal", title: "Dinner", mealType: "dinner" },
        ],
      },
      {
        title: "Shimla local sightseeing",
        from: "shimla",
        to: "shimla",
        segments: [
          { type: "meal", title: "Breakfast", mealType: "breakfast" },
          { type: "sightseeing", title: "Kufri excursion" },
          { type: "activity", title: "Himalayan Nature Park" },
        ],
      },
      {
        title: "Shimla to Manali",
        from: "shimla",
        to: "manali",
        segments: [
          { type: "transfer", title: "Shimla → Manali", transportMode: "tempo_traveller" },
          { type: "accommodation", title: "Hotel check-in" },
        ],
      },
    ],
  });

  await upsertTrip({
    slug: "kasol-parvati-valley",
    name: "Kasol & Parvati Valley",
    summary: "5-day Parvati Valley getaway",
    durationDays: 5,
    durationNights: 4,
    status: "draft",
    destinationSlugs: ["delhi", "kasol"],
    destinations,
    days: [
      {
        title: "Arrival in Kasol",
        from: "delhi",
        to: "kasol",
        segments: [
          { type: "transfer", title: "Delhi → Kasol", transportMode: "bus" },
          { type: "accommodation", title: "Riverside stay check-in" },
          { type: "free_time", title: "Leisure by the Parvati river" },
        ],
      },
      {
        title: "Kheerganga trek",
        from: "kasol",
        to: "kasol",
        segments: [
          { type: "meal", title: "Breakfast", mealType: "breakfast" },
          { type: "activity", title: "Kheerganga guided trek" },
          { type: "note", title: "Carry warm layers and water" },
        ],
      },
    ],
  });
  console.log("✔ 2 trips with itineraries");

  // --- Light catalogue (only if empty) ----------------------------------
  await seedCatalogueIfEmpty(destinations);

  console.log("Done. Sign in with the admin credentials above.");
}

interface DaySeed {
  title: string;
  from?: string;
  to?: string;
  segments: Array<{
    type: "transfer" | "accommodation" | "meal" | "activity" | "sightseeing" | "free_time" | "note";
    title: string;
    transportMode?: string;
    mealType?: string;
  }>;
}

async function upsertTrip(input: {
  slug: string;
  name: string;
  summary: string;
  durationDays: number;
  durationNights: number;
  status: "draft" | "active" | "archived";
  destinationSlugs: string[];
  destinations: Record<string, string>;
  days: DaySeed[];
}) {
  const trip = await prisma.trip.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      summary: input.summary,
      durationDays: input.durationDays,
      durationNights: input.durationNights,
      status: input.status,
    },
    create: {
      slug: input.slug,
      name: input.name,
      summary: input.summary,
      description: DEV,
      durationDays: input.durationDays,
      durationNights: input.durationNights,
      status: input.status,
    },
    select: { id: true },
  });

  // Reset ordered destinations + itinerary for idempotency.
  await prisma.tripDestination.deleteMany({ where: { tripId: trip.id } });
  await prisma.itineraryDay.deleteMany({ where: { tripId: trip.id } });

  await prisma.tripDestination.createMany({
    data: input.destinationSlugs.map((slug, i) => ({
      tripId: trip.id,
      destinationId: input.destinations[slug]!,
      sortOrder: i,
    })),
  });

  for (let d = 0; d < input.days.length; d++) {
    const day = input.days[d]!;
    await prisma.itineraryDay.create({
      data: {
        tripId: trip.id,
        dayNumber: d + 1,
        title: day.title,
        fromDestinationId: day.from ? input.destinations[day.from] : null,
        toDestinationId: day.to ? input.destinations[day.to] : null,
        segments: {
          create: day.segments.map((s, i) => ({
            sortOrder: i,
            type: s.type,
            title: s.title,
            transportMode: (s.transportMode as never) ?? null,
            mealType: (s.mealType as never) ?? null,
          })),
        },
      },
    });
  }
}

async function seedCatalogueIfEmpty(destinations: Record<string, string>) {
  if ((await prisma.accommodation.count()) === 0) {
    const hotel = await prisma.accommodation.create({
      data: {
        name: "Hotel Snow Valley",
        destinationId: destinations["manali"]!,
        category: "deluxe",
        starRating: 3,
        description: DEV,
        amenities: ["WiFi", "Parking", "Restaurant"],
        roomTypes: {
          create: [
            {
              name: "Deluxe Room",
              occupancy: "double",
              category: "deluxe",
              prices: {
                create: [
                  { amountMinor: inr(4500), unit: "per_room_per_night", season: "peak" },
                  { amountMinor: inr(3500), unit: "per_room_per_night", season: "off_peak" },
                ],
              },
            },
            {
              name: "Standard Room",
              occupancy: "triple",
              category: "standard",
              prices: { create: [{ amountMinor: inr(3000), unit: "per_room_per_night" }] },
            },
          ],
        },
      },
    });
    console.log(`✔ Accommodation: ${hotel.name} (+ room types & prices)`);
  }

  if ((await prisma.transportation.count()) === 0) {
    await prisma.transportation.create({
      data: {
        name: "Tempo Traveller (12-seater)",
        mode: "tempo_traveller",
        capacity: 12,
        routeFrom: "Manali",
        routeTo: "Kasol",
        prices: { create: [{ amountMinor: inr(8000), unit: "per_vehicle" }] },
      },
    });
    await prisma.transportation.create({
      data: {
        name: "Volvo Bus",
        mode: "bus",
        capacity: 40,
        routeFrom: "Delhi",
        routeTo: "Kasol",
        prices: { create: [{ amountMinor: inr(1200), unit: "per_person" }] },
      },
    });
    console.log("✔ Transport options (+ prices)");
  }

  if ((await prisma.activity.count()) === 0) {
    await prisma.activity.create({
      data: {
        name: "Paragliding (Solang)",
        type: "adventure",
        destinationId: destinations["manali"]!,
        description: DEV,
        durationMinutes: 30,
        prices: { create: [{ amountMinor: inr(1800), unit: "per_person" }] },
      },
    });
    await prisma.activity.create({
      data: {
        name: "Kheerganga Guided Trek",
        type: "excursion",
        destinationId: destinations["kasol"]!,
        description: DEV,
        prices: { create: [{ amountMinor: inr(1500), unit: "per_person" }] },
      },
    });
    console.log("✔ Activities (+ prices)");
  }

  if ((await prisma.meal.count()) === 0) {
    await prisma.meal.create({
      data: {
        name: "MAP Plan (Breakfast + Dinner)",
        mealType: "dinner",
        plan: "MAP",
        prices: { create: [{ amountMinor: inr(700), unit: "per_person_per_night" }] },
      },
    });
    console.log("✔ Meals (+ prices)");
  }

  if ((await prisma.addon.count()) === 0) {
    await prisma.addon.create({
      data: {
        name: "Airport Transfer",
        description: DEV,
        prices: { create: [{ amountMinor: inr(2500), unit: "fixed" }] },
      },
    });
    console.log("✔ Add-ons (+ prices)");
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
