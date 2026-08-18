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

/**
 * Admin credentials are configured by ENVIRONMENT VARIABLE, not by positional
 * argument. Silently ignoring `npm run seed <email> <password>` is a trap: the
 * seed appears to succeed while actually writing the DEFAULT password, so the
 * credentials the operator believes they set never work. Fail loudly instead.
 */
function rejectPositionalArgs(): void {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  if (args.length === 0) return;
  console.error(
    `\n✖ This script does not take positional arguments (received: ${args.join(" ")}).\n` +
      `  Admin credentials are read from environment variables.\n\n` +
      `  PowerShell:\n` +
      `    $env:SEED_ADMIN_EMAIL="you@trip-le.com"; $env:SEED_ADMIN_PASSWORD="YourPassword"; npm run seed\n\n` +
      `  Bash:\n` +
      `    SEED_ADMIN_EMAIL=you@trip-le.com SEED_ADMIN_PASSWORD=YourPassword npm run seed\n\n` +
      `  Omit them to seed the documented defaults instead.\n`,
  );
  process.exit(1);
}

async function main() {
  rejectPositionalArgs();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your .env before seeding.");
  }

  // --- Admin user --------------------------------------------------------
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@trip-le.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#12345";
  const name = process.env.SEED_ADMIN_NAME ?? "Trip Le Admin";
  const usingDefaults = !process.env.SEED_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);
  // Reset passwordHash on every run too — otherwise an admin created by an earlier
  // seed keeps its original password and the documented dev credentials stop
  // working. Idempotent: the hash is recomputed from the same (default or env)
  // password each time.
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: "admin", active: true, passwordHash },
    create: { email, name, passwordHash, role: "admin", active: true },
  });
  // Say exactly which password was written. "reset to configured value" hid the
  // difference between a custom password and the fallback default.
  console.log(
    `✔ Admin user: ${admin.email} — password set to ` +
      (usingDefaults
        ? `the DEFAULT "${password}" (SEED_ADMIN_PASSWORD was not set)`
        : "the value from SEED_ADMIN_PASSWORD"),
  );

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

  // --- Trip-specific available options (idempotent) ---------------------
  // The planner shows ONLY a trip's enabled options. Enable a CURATED subset for
  // the test trip (not every record) so trip-specific selection is demonstrable.
  await seedTripOptions("himachal-explorer");

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
  // Each block is guarded by a count so reruns never duplicate. All records carry
  // the [DEV SAMPLE] tag. Enough breadth (multiple hotels, occupancies, seasons,
  // transport capacities, meals, add-ons, and priced supplier costs) to exercise
  // every module and the future pricing engine.
  if ((await prisma.accommodation.count()) === 0) {
    await prisma.accommodation.create({
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
              maxOccupancy: 3,
              prices: {
                create: [
                  {
                    amountMinor: inr(4500),
                    supplierCostMinor: inr(3200),
                    unit: "per_room_per_night",
                    season: "peak",
                    validFrom: new Date("2026-12-01"),
                    validUntil: new Date("2027-01-15"),
                  },
                  {
                    // Year-round base (generic): applies whenever no seasonal
                    // window matches, and is the unambiguous default without a date.
                    amountMinor: inr(3500),
                    supplierCostMinor: inr(2500),
                    unit: "per_room_per_night",
                    season: "all",
                  },
                ],
              },
            },
            {
              name: "Standard Room",
              occupancy: "triple",
              category: "standard",
              prices: {
                create: [
                  { amountMinor: inr(3000), supplierCostMinor: inr(2100), unit: "per_room_per_night", season: "all" },
                ],
              },
            },
          ],
        },
      },
    });
    await prisma.accommodation.create({
      data: {
        name: "Hotel Mountain View",
        destinationId: destinations["shimla"]!,
        category: "premium",
        starRating: 4,
        description: DEV,
        amenities: ["WiFi", "Spa", "Restaurant", "Bar"],
        roomTypes: {
          create: [
            {
              name: "Premium Room",
              occupancy: "double",
              category: "premium",
              prices: {
                create: [
                  { amountMinor: inr(6500), supplierCostMinor: inr(4800), unit: "per_room_per_night", season: "peak", validFrom: new Date("2026-12-01"), validUntil: new Date("2027-01-15") },
                  // Year-round base (generic) — unambiguous default.
                  { amountMinor: inr(5000), supplierCostMinor: inr(3600), unit: "per_room_per_night", season: "all" },
                ],
              },
            },
            {
              name: "Family Suite",
              occupancy: "quad",
              category: "suite",
              maxOccupancy: 5,
              prices: {
                create: [
                  { amountMinor: inr(9000), supplierCostMinor: inr(6800), unit: "per_room_per_night", season: "all", minPax: 3, maxPax: 5 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log("✔ 2 accommodations (+ room types, occupancies, seasonal prices)");
  }

  if ((await prisma.transportation.count()) === 0) {
    await prisma.transportation.create({
      data: { name: "Private Sedan (Dzire)", mode: "private_sedan", vehicleType: "Dzire", capacity: 4, routeFrom: "Delhi", routeTo: "Shimla",
        prices: { create: [{ amountMinor: inr(9000), supplierCostMinor: inr(7000), unit: "per_vehicle" }] } },
    });
    await prisma.transportation.create({
      data: { name: "Private SUV (Innova)", mode: "suv", vehicleType: "Innova Crysta", capacity: 6, routeFrom: "Delhi", routeTo: "Manali",
        prices: { create: [{ amountMinor: inr(12000), supplierCostMinor: inr(9500), unit: "per_vehicle" }] } },
    });
    await prisma.transportation.create({
      data: { name: "Tempo Traveller (12-seater)", mode: "tempo_traveller", capacity: 12, routeFrom: "Manali", routeTo: "Kasol",
        prices: { create: [{ amountMinor: inr(8000), supplierCostMinor: inr(6000), unit: "per_vehicle" }] } },
    });
    await prisma.transportation.create({
      data: { name: "Volvo Bus", mode: "bus", capacity: 40, routeFrom: "Delhi", routeTo: "Kasol",
        prices: { create: [{ amountMinor: inr(1200), supplierCostMinor: inr(850), unit: "per_person" }] } },
    });
    await prisma.transportation.create({
      data: { name: "Kalka–Shimla Toy Train", mode: "train", capacity: 100, routeFrom: "Kalka", routeTo: "Shimla",
        prices: { create: [{ amountMinor: inr(1200), unit: "per_person" }] } },
    });
    await prisma.transportation.create({
      data: { name: "Airport Transfer (Sedan)", mode: "airport_transfer", vehicleType: "Sedan", capacity: 4, routeFrom: "Delhi Airport", routeTo: "Hotel",
        prices: { create: [{ amountMinor: inr(2500), supplierCostMinor: inr(1800), unit: "per_vehicle" }] } },
    });
    console.log("✔ Transport options across modes/capacities (+ prices)");
  }

  if ((await prisma.activity.count()) === 0) {
    await prisma.activity.create({
      data: { name: "Paragliding (Solang)", type: "adventure", destinationId: destinations["manali"]!, description: DEV, durationMinutes: 30,
        prices: { create: [{ amountMinor: inr(1800), supplierCostMinor: inr(1200), unit: "per_person" }] } },
    });
    await prisma.activity.create({
      data: { name: "Kheerganga Guided Trek", type: "excursion", destinationId: destinations["kasol"]!, description: DEV, durationMinutes: 480,
        prices: { create: [{ amountMinor: inr(1500), supplierCostMinor: inr(1000), unit: "per_person" }] } },
    });
    await prisma.activity.create({
      data: { name: "Shimla City Tour", type: "sightseeing", destinationId: destinations["shimla"]!, description: DEV, durationMinutes: 240,
        prices: { create: [{ amountMinor: inr(3500), supplierCostMinor: inr(2500), unit: "per_group" }] } },
    });
    console.log("✔ Activities across types (+ prices)");
  }

  if ((await prisma.meal.count()) === 0) {
    await prisma.meal.create({
      data: { name: "CP Plan (Breakfast only)", mealType: "breakfast", plan: "CP",
        prices: { create: [{ amountMinor: inr(300), unit: "per_person_per_night" }] } },
    });
    await prisma.meal.create({
      data: { name: "MAP Plan (Breakfast + Dinner)", mealType: "dinner", plan: "MAP",
        prices: { create: [{ amountMinor: inr(700), supplierCostMinor: inr(480), unit: "per_person_per_night" }] } },
    });
    await prisma.meal.create({
      data: { name: "AP Plan (All meals)", mealType: "lunch", plan: "AP",
        prices: { create: [{ amountMinor: inr(1100), supplierCostMinor: inr(780), unit: "per_person_per_night" }] } },
    });
    console.log("✔ Meal plans (CP / MAP / AP) (+ prices)");
  }

  if ((await prisma.addon.count()) === 0) {
    await prisma.addon.create({
      data: { name: "Airport Transfer", description: DEV,
        prices: { create: [{ amountMinor: inr(2500), supplierCostMinor: inr(1800), unit: "fixed" }] } },
    });
    await prisma.addon.create({
      data: { name: "Extra Night", description: DEV,
        prices: { create: [{ amountMinor: inr(3500), unit: "per_room_per_night" }] } },
    });
    await prisma.addon.create({
      data: { name: "Local Guide", description: DEV,
        prices: { create: [{ amountMinor: inr(2000), supplierCostMinor: inr(1400), unit: "per_day" }] } },
    });
    await prisma.addon.create({
      data: { name: "Travel Insurance", description: DEV,
        prices: { create: [{ amountMinor: inr(499), unit: "per_person" }] } },
    });
    console.log("✔ Add-ons (transfer, extra night, guide, insurance) (+ prices)");
  }
}

/**
 * Enable a curated subset of catalogue records as options for a test trip. Some
 * records are deliberately left disabled to prove the planner respects
 * trip-specific selection. Idempotent (upsert by composite key).
 */
async function seedTripOptions(tripSlug: string) {
  const trip = await prisma.trip.findUnique({ where: { slug: tripSlug }, select: { id: true } });
  if (!trip) return;
  const tripId = trip.id;

  const enableAcc = ["Hotel Snow Valley", "Hotel Mountain View"];
  const enableTransport = [
    "Tempo Traveller (12-seater)",
    "Private SUV (Innova)",
    "Volvo Bus",
    "Kalka–Shimla Toy Train",
  ]; // Private Sedan + Airport Transfer left OFF on purpose
  const enableActivities = ["Paragliding (Solang)", "Shimla City Tour"]; // Kheerganga (Kasol) OFF
  const enableAddons = ["Airport Transfer", "Extra Night", "Local Guide"]; // Travel Insurance OFF

  const accs = await prisma.accommodation.findMany({
    where: { name: { in: enableAcc } },
    select: { id: true },
  });
  for (const a of accs)
    await prisma.tripAccommodationOption.upsert({
      where: { tripId_accommodationId: { tripId, accommodationId: a.id } },
      create: { tripId, accommodationId: a.id, active: true },
      update: { active: true },
    });

  const transports = await prisma.transportation.findMany({
    where: { name: { in: enableTransport } },
    select: { id: true },
  });
  for (const t of transports)
    await prisma.tripTransportationOption.upsert({
      where: { tripId_transportationId: { tripId, transportationId: t.id } },
      create: { tripId, transportationId: t.id, active: true },
      update: { active: true },
    });

  const activities = await prisma.activity.findMany({
    where: { name: { in: enableActivities } },
    select: { id: true },
  });
  for (const a of activities)
    await prisma.tripActivityOption.upsert({
      where: { tripId_activityId: { tripId, activityId: a.id } },
      create: { tripId, activityId: a.id, active: true },
      update: { active: true },
    });

  const meals = await prisma.meal.findMany({ select: { id: true } }); // all meal plans
  for (const m of meals)
    await prisma.tripMealOption.upsert({
      where: { tripId_mealId: { tripId, mealId: m.id } },
      create: { tripId, mealId: m.id, active: true },
      update: { active: true },
    });

  const addons = await prisma.addon.findMany({
    where: { name: { in: enableAddons } },
    select: { id: true },
  });
  for (const ad of addons)
    await prisma.tripAddonOption.upsert({
      where: { tripId_addonId: { tripId, addonId: ad.id } },
      create: { tripId, addonId: ad.id, active: true },
      update: { active: true },
    });

  console.log(
    `✔ Trip options for ${tripSlug}: ${accs.length} hotels, ${transports.length} transport, ${activities.length} activities, ${meals.length} meals, ${addons.length} add-ons`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
