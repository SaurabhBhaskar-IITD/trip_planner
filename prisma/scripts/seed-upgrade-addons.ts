/**
 * Hotel & Travel upgrade add-ons for the 26 public packages.
 *
 *   npm run seed:addons                                   dry run — writes nothing
 *   npm run seed:addons -- --apply --target=<db-host>     write (host must match DATABASE_URL)
 *   … add --publish to also hand the 25 non-Manali trips to the planner
 *     (status active + publicOptionsEnabled). Do this only AFTER trip-le.com
 *     with the v2 options client is deployed.
 *
 * IDEMPOTENT — re-running converges, never duplicates:
 *   - master add-ons are matched by name (case-insensitive) and only CREATED
 *     when missing; an existing master only gets its category set;
 *   - trip customizations are upserted on the (tripId, addonId) key;
 *   - trips are matched by slug and never created here.
 *
 * NEVER CHANGED: base prices (they live on trip-le.com), durations that are
 * already set, itineraries, inclusions/exclusions, quotes, bookings. Manali's
 * existing live customizations keep their prices and active state; they only
 * gain a category and (sharing) a room occupancy.
 *
 * Prices are customer-facing selling prices from market research (Oct 2026,
 * see the PROVENANCE notes). Supplier cost is unknown and left empty.
 * Anything that could not be priced responsibly is PRICE ON REQUEST.
 */
import { PrismaClient, type AddonCategory, type PricingUnit } from "@prisma/client";

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const PUBLISH = args.includes("--publish");
const TARGET = args.find((a) => a.startsWith("--target="))?.slice("--target=".length);

const NOTE_ESTIMATE = "Market-research estimate (Oct 2026). Confirm with suppliers; supplier cost not yet recorded.";
const NOTE_ON_REQUEST = "Price on request: needs supplier confirmation for the travel date.";

// --------------------------------------------------------------- catalogue

interface MasterSpec {
  name: string;
  category: AddonCategory;
  description: string;
}

/** Reusable master add-ons. Trip-specific text/prices live on each trip row. */
const MASTERS: MasterSpec[] = [
  { name: "Quad Sharing", category: "HOTEL_UPGRADE", description: "Four travellers to a room — the base package configuration." },
  { name: "Triple Sharing Upgrade", category: "HOTEL_UPGRADE", description: "Three travellers to a room." },
  { name: "Double Sharing Upgrade", category: "HOTEL_UPGRADE", description: "Two travellers to a room." },
  { name: "Premium Hotel Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade to a higher-category hotel or resort selected from Trip Le's available properties, confirmed for your dates." },
  { name: "Luxury Hotel Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade to a premium 4–5★ property, confirmed for your dates and availability." },
  { name: "Heritage Hotel Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade to a higher-category heritage hotel or haveli, confirmed for your dates." },
  { name: "Resort Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade to a higher-category resort, confirmed for your dates." },
  { name: "Luxury Camp Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade your camp night to a luxury tent." },
  { name: "Luxury Houseboat Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade your houseboat night to a luxury-category houseboat." },
  { name: "4★ Hotel Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade your stay to selected 4★ properties, confirmed for your dates." },
  { name: "5★ Hotel Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade to selected 5★ properties, confirmed for your dates." },
  { name: "Private Pool Villa Upgrade", category: "HOTEL_UPGRADE", description: "Stay in a private pool villa, confirmed for your dates." },
  { name: "Water Villa Upgrade", category: "HOTEL_UPGRADE", description: "Upgrade from a beach villa to an overwater villa at your resort." },
  { name: "Airport Transfer", category: "TRAVEL_UPGRADE", description: "Private airport transfer." },
  { name: "Volvo Upgrade", category: "TRAVEL_UPGRADE", description: "Travel the overnight legs by AC Volvo coach instead of the group vehicle." },
  { name: "Private Vehicle Upgrade", category: "TRAVEL_UPGRADE", description: "A private vehicle for your group instead of shared transport." },
  { name: "Speedboat Tour Upgrade", category: "TRAVEL_UPGRADE", description: "Do the island tours by speedboat instead of the standard boat." },
  { name: "Domestic Flight Upgrade", category: "TRAVEL_UPGRADE", description: "Fly this sector instead of travelling by road/sea." },
  { name: "Seaplane Transfer Upgrade", category: "TRAVEL_UPGRADE", description: "Seaplane transfers to a seaplane-access resort." },
  { name: "Private Transfers Upgrade", category: "TRAVEL_UPGRADE", description: "Private transfers and touring instead of shared (seat-in-coach) services." },
];

// ----------------------------------------------------------- per-trip plan

type Price = { rupees: number; unit: PricingUnit } | "on_request";

interface OptionSpec {
  addon: string;
  price: Price;
  sortOrder: number;
  description?: string;
  group?: string;
  isDefault?: boolean;
  isRecommended?: boolean;
  roomOccupancy?: number;
  availabilityNote?: string;
}

interface TripSpec {
  slug: string;
  /** Travellers per room in the base package. */
  baseRoomOccupancy: number;
  /** Fills a NULL duration only (from the published package); never overwrites. */
  nights: number;
  days: number;
  options: OptionSpec[];
}

// PROVENANCE
//  Room sharing: Manali's live rates (triple +₹1,000 / double +₹2,000 pp over
//    2 nights) expressed per person per night (₹500 / ₹1,000) for the other
//    domestic packages; WanderOn publishes triple→double ≈ ₹1,500 over 4–5 nights.
//  Premium Hotel (domestic hills/beach): Manali 3★ ≈ US$37 vs 4★ ≈ US$57 a room
//    night (Skyscanner averages) → ≈ ₹2,300 per room night; spread over a quad
//    room ≈ ₹700 per person per night.
//  Volvo: HRTC AC Volvo Delhi–Manali ≈ ₹900–1,200 one way → ₹2,000 pp return.
//  Luxury desert camp: Sam dunes Swiss tent ≈ US$50 vs luxury ≈ US$75–150.
//  Thailand 4★: operator packages ₹5,000–8,000 pp over 5N (3★→4★) ≈ ₹2,500 per
//    twin room night. Speedboat: +250–400 THB pp per tour ≈ ₹1,800 for both tours.
//  Singapore 3★ US$78 → 4★ US$117; KL cheaper → ≈ ₹2,500 per room night.
//  Vietnam: Hanoi 4★ +US$61, Da Nang +US$69 → ≈ ₹5,500 per room night.
//  Kathmandu 3★ US$28 → 4★ US$46 → ≈ ₹1,500 per room night.
//  Thimphu 3★ €40 → 4★ €98 → ≈ ₹5,000 per room night.
//  Kathmandu ⇄ Pokhara return flight ≈ ₹6,959 (Skyscanner) → ₹7,000 pp.
//  ON REQUEST: anything resort-, supplier- or vehicle-size-dependent (luxury
//    hotels, heritage palaces, water villas, seaplanes, private vehicles for
//    multi-day loops, flights with wide fare spreads).

const DOMESTIC_SHARING = (sort = 10): OptionSpec[] => [
  { addon: "Quad Sharing", price: { rupees: 0, unit: "per_person" }, sortOrder: sort, group: "sharing", isDefault: true, roomOccupancy: 4, description: "Included — four travellers to a room, the base package configuration." },
  { addon: "Triple Sharing Upgrade", price: { rupees: 500, unit: "per_person_per_night" }, sortOrder: sort + 1, group: "sharing", roomOccupancy: 3, description: "Three travellers to a room." },
  { addon: "Double Sharing Upgrade", price: { rupees: 1000, unit: "per_person_per_night" }, sortOrder: sort + 2, group: "sharing", roomOccupancy: 2, description: "Two travellers to a room." },
];

const [MKB_QUAD, MKB_TRIPLE, MKB_DOUBLE] = DOMESTIC_SHARING() as [OptionSpec, OptionSpec, OptionSpec];

const PREMIUM_HILLS: OptionSpec = {
  addon: "Premium Hotel Upgrade",
  price: { rupees: 700, unit: "per_person_per_night" },
  sortOrder: 20,
  group: "hotel-category",
  isRecommended: true,
  description: "Upgrade from a standard 2–3★ to a higher-category 3–4★ hotel selected from Trip Le's available properties.",
  availabilityNote: "Exact hotel confirmed for your dates. Festive dates may cost more.",
};

const LUXURY_ON_REQUEST: OptionSpec = {
  addon: "Luxury Hotel Upgrade",
  price: "on_request",
  sortOrder: 21,
  group: "hotel-category",
  description: "Upgrade to a premium 4–5★ property. Priced for your dates on request.",
};

const PRIVATE_VEHICLE = (description: string): OptionSpec => ({
  addon: "Private Vehicle Upgrade",
  price: "on_request",
  sortOrder: 31,
  group: "transport",
  description,
  availabilityNote: "Priced for your group size and dates.",
});

const VOLVO: OptionSpec = {
  addon: "Volvo Upgrade",
  price: { rupees: 2000, unit: "per_person" },
  sortOrder: 30,
  group: "transport",
  isRecommended: true,
  description: "Travel the overnight Delhi legs (both ways) by AC Volvo coach instead of the group tempo traveller.",
  availabilityNote: "Subject to seat availability on your dates.",
};

const FOUR_STAR = (rupeesPerRoomNight: number): OptionSpec => ({
  addon: "4★ Hotel Upgrade",
  price: { rupees: rupeesPerRoomNight, unit: "per_room_per_night" },
  sortOrder: 20,
  group: "hotel-category",
  isRecommended: true,
  description: "Upgrade from 3★ to selected 4★ properties for every night of the trip.",
  availabilityNote: "Exact hotels confirmed for your dates. Peak dates may cost more.",
});

const SPEEDBOAT: OptionSpec = {
  addon: "Speedboat Tour Upgrade",
  price: { rupees: 1800, unit: "per_person" },
  sortOrder: 30,
  description: "Do the Phi Phi and Krabi 4-island tours by speedboat instead of the big boat / longtail — faster crossings, more time on the islands.",
  availabilityNote: "Subject to sea conditions and availability.",
};

const TRIPS: TripSpec[] = [
  // ---------------- Himachal
  {
    slug: "manali",
    baseRoomOccupancy: 4,
    nights: 2,
    days: 3,
    // Existing live rows (Quad/Triple/Double, Airport Transfer) are kept as-is —
    // see MANALI_KEEP. Only new upgrades are listed here.
    // Sort after the live sharing rows (10/20/30), before Airport Transfer (60).
    options: [{ ...PREMIUM_HILLS, sortOrder: 35 }, { ...LUXURY_ON_REQUEST, sortOrder: 36 }],
  },
  {
    // 5N includes an overnight journey: only 4 nights are in hotels, so the
    // per-night rates are applied to those 4 nights as one per-person price.
    slug: "manali-kasol-bir-billing",
    baseRoomOccupancy: 4, nights: 5, days: 6,
    options: [
      MKB_QUAD,
      { ...MKB_TRIPLE, price: { rupees: 2000, unit: "per_person" }, description: "Three travellers to a room for your 4 hotel nights." },
      { ...MKB_DOUBLE, price: { rupees: 4000, unit: "per_person" }, description: "Two travellers to a room for your 4 hotel nights." },
      { ...PREMIUM_HILLS, price: { rupees: 2800, unit: "per_person" }, description: "Upgrade your 4 hotel nights (Bir, Manali, Kasol) to higher-category 3–4★ hotels selected from Trip Le's available properties." },
      VOLVO,
      PRIVATE_VEHICLE("A private SUV for your group for the whole Delhi–Delhi loop instead of the shared tempo traveller."),
    ],
  },
  {
    slug: "dharamshala-mcleodganj",
    baseRoomOccupancy: 4, nights: 2, days: 3,
    options: [...DOMESTIC_SHARING(), PREMIUM_HILLS, VOLVO, PRIVATE_VEHICLE("A private cab for your group, Delhi–Delhi, instead of shared transport.")],
  },
  {
    slug: "kasol-kheerganga-trek",
    baseRoomOccupancy: 4, nights: 2, days: 3,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Premium Hotel Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "A premium riverside stay for your Kasol night (the Kheerganga camp night is unchanged)." },
      VOLVO,
      PRIVATE_VEHICLE("A private cab for your group, Delhi–Kasol–Delhi, instead of the shared tempo traveller."),
    ],
  },
  // ---------------- Uttarakhand
  {
    slug: "dehradun-mussoorie",
    baseRoomOccupancy: 4, nights: 2, days: 3,
    options: [...DOMESTIC_SHARING(), PREMIUM_HILLS, LUXURY_ON_REQUEST, PRIVATE_VEHICLE("A private cab for your group, Delhi–Delhi, instead of the shared AC tempo traveller.")],
  },
  {
    slug: "haridwar-rishikesh",
    baseRoomOccupancy: 4, nights: 2, days: 3,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Luxury Camp Upgrade", price: "on_request", sortOrder: 20, description: "Upgrade your riverside camp night to a luxury cottage / tent." },
      PRIVATE_VEHICLE("A private cab for your group, Delhi–Delhi, instead of the shared tempo traveller."),
    ],
  },
  {
    slug: "nainital-neem-karoli-jim-corbett",
    baseRoomOccupancy: 4, nights: 3, days: 4,
    options: [...DOMESTIC_SHARING(), PREMIUM_HILLS, LUXURY_ON_REQUEST, PRIVATE_VEHICLE("A private SUV for your group, Delhi–Delhi, instead of the shared tempo traveller.")],
  },
  // ---------------- Rajasthan
  {
    slug: "udaipur-mount-abu-kumbhalgarh",
    baseRoomOccupancy: 4, nights: 3, days: 4,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Heritage Hotel Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to a higher-category heritage hotel / palace-style property." },
      PRIVATE_VEHICLE("A private Innova Crysta for your group for the whole circuit."),
    ],
  },
  {
    slug: "kumbhalgarh",
    baseRoomOccupancy: 4, nights: 2, days: 3,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Resort Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to a higher-category Aravalli resort." },
      PRIVATE_VEHICLE("A private SUV for your Udaipur transfers and sightseeing."),
    ],
  },
  {
    slug: "udaipur-mount-abu",
    baseRoomOccupancy: 4, nights: 3, days: 4,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Heritage Hotel Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to a higher-category heritage hotel / palace-style property." },
      PRIVATE_VEHICLE("A private Innova Crysta for your group for the whole trip."),
    ],
  },
  {
    slug: "jaisalmer",
    baseRoomOccupancy: 4, nights: 2, days: 3,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Luxury Camp Upgrade", price: { rupees: 1500, unit: "per_person" }, sortOrder: 20, isRecommended: true, description: "Upgrade your Sam dunes night from a Swiss tent to a luxury tent.", availabilityNote: "Subject to availability on your dates." },
      PRIVATE_VEHICLE("A private SUV for your transfers and sightseeing."),
    ],
  },
  {
    slug: "rajasthan-grand-circuit",
    baseRoomOccupancy: 4, nights: 9, days: 10,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Heritage Hotel Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to higher-category heritage hotels across the circuit." },
      PRIVATE_VEHICLE("A private Innova Crysta for your group for the whole circuit."),
    ],
  },
  // ---------------- Kashmir
  {
    slug: "kashmir",
    baseRoomOccupancy: 4, nights: 3, days: 4,
    options: [
      ...DOMESTIC_SHARING(),
      // Hotels on 2 of the 3 nights (the third is the houseboat): ₹700 × 2 nights.
      { ...PREMIUM_HILLS, price: { rupees: 1400, unit: "per_person" }, description: "Upgrade your two hotel nights to higher-category 3–4★ hotels (the houseboat night is unchanged)." },
      { addon: "Luxury Houseboat Upgrade", price: "on_request", sortOrder: 22, description: "Upgrade your Dal Lake night to a luxury-category houseboat." },
      PRIVATE_VEHICLE("A premium private SUV (Innova Crysta) for your transfers and day trips."),
    ],
  },
  // ---------------- North East
  {
    slug: "meghalaya-arunachal",
    baseRoomOccupancy: 4, nights: 5, days: 6,
    options: [
      ...DOMESTIC_SHARING(),
      // Hotels on 4 of the 5 nights (one is the riverside camp): ₹700 × 4 nights.
      { ...PREMIUM_HILLS, price: { rupees: 2800, unit: "per_person" }, description: "Upgrade your 4 hotel nights to higher-category 3–4★ hotels (the riverside camp night is unchanged)." },
      PRIVATE_VEHICLE("A private SUV for your group from Guwahati instead of the shared tempo traveller."),
    ],
  },
  {
    slug: "sikkim-darjeeling",
    baseRoomOccupancy: 4, nights: 5, days: 6,
    options: [
      ...DOMESTIC_SHARING(),
      PREMIUM_HILLS,
      { ...PRIVATE_VEHICLE("A private Innova for your NJP/Bagdogra ⇄ Gangtok ⇄ Darjeeling transfers."), availabilityNote: "Gangtok sightseeing must still use local union vehicles." },
    ],
  },
  // ---------------- Goa
  {
    slug: "goa",
    baseRoomOccupancy: 4, nights: 3, days: 4,
    options: [
      ...DOMESTIC_SHARING(),
      { addon: "Resort Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to a 4★ beach resort near Calangute–Candolim." },
    ],
  },
  // ---------------- International (twin basis)
  { slug: "phuket-krabi", baseRoomOccupancy: 2, nights: 5, days: 6, options: [FOUR_STAR(2500), SPEEDBOAT] },
  { slug: "phuket-krabi-bangkok", baseRoomOccupancy: 2, nights: 8, days: 9, options: [FOUR_STAR(2500), SPEEDBOAT] },
  {
    slug: "phuket-krabi-koh-samui",
    baseRoomOccupancy: 2, nights: 8, days: 9,
    options: [
      FOUR_STAR(2500),
      SPEEDBOAT,
      { addon: "Domestic Flight Upgrade", price: "on_request", sortOrder: 31, description: "Fly Krabi → Koh Samui (Bangkok Airways) instead of bus + ferry (about 45 minutes instead of 5 hours)." },
    ],
  },
  {
    slug: "bali",
    baseRoomOccupancy: 2, nights: 5, days: 6,
    // Base is already 3★/4★ with a PRIVATE car and driver: no transport upgrade.
    options: [
      { addon: "5★ Hotel Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to selected 5★ resorts in Seminyak and Ubud." },
      { addon: "Private Pool Villa Upgrade", price: "on_request", sortOrder: 21, group: "hotel-category", description: "Stay your Ubud nights in a private pool villa." },
    ],
  },
  {
    slug: "maldives",
    baseRoomOccupancy: 2, nights: 3, days: 4,
    options: [
      { addon: "Water Villa Upgrade", price: "on_request", sortOrder: 20, isRecommended: true, description: "Upgrade from a beach villa to an overwater villa at your resort." },
      { addon: "Seaplane Transfer Upgrade", price: "on_request", sortOrder: 30, description: "Move to a seaplane-access resort with seaplane transfers (daylight only)." },
    ],
  },
  {
    slug: "nepal",
    baseRoomOccupancy: 2, nights: 5, days: 6,
    options: [
      FOUR_STAR(1500),
      { addon: "Domestic Flight Upgrade", price: { rupees: 7000, unit: "per_person" }, sortOrder: 30, isRecommended: true, description: "Fly Kathmandu ⇄ Pokhara (both ways, ~25 minutes each) instead of the 6–7 hour drive.", availabilityNote: "Subject to seat availability and mountain weather." },
    ],
  },
  {
    slug: "singapore-malaysia",
    baseRoomOccupancy: 2, nights: 6, days: 7,
    options: [
      FOUR_STAR(2500),
      { addon: "Private Transfers Upgrade", price: "on_request", sortOrder: 30, group: "transport", description: "Private airport transfers and private city tours instead of shared (seat-in-coach) services." },
      { addon: "Domestic Flight Upgrade", price: "on_request", sortOrder: 31, group: "transport", description: "Fly Singapore → Kuala Lumpur instead of the coach." },
    ],
  },
  {
    slug: "vietnam",
    baseRoomOccupancy: 2, nights: 6, days: 7,
    // Transfers are already private and the Hanoi→Da Nang flight is included.
    options: [FOUR_STAR(5500)],
  },
  {
    slug: "dubai",
    baseRoomOccupancy: 2, nights: 4, days: 5,
    // Airport transfers are already private: the upgrade is the shared tours.
    options: [
      { addon: "Premium Hotel Upgrade", price: "on_request", sortOrder: 20, group: "hotel-category", description: "Upgrade to a 4–5★ hotel in Downtown Dubai or Dubai Marina." },
      { addon: "Private Transfers Upgrade", price: "on_request", sortOrder: 30, description: "Private vehicle for the city tour and Abu Dhabi day instead of shared tours." },
    ],
  },
  {
    slug: "bhutan",
    baseRoomOccupancy: 2, nights: 6, days: 7,
    options: [
      FOUR_STAR(5000),
      { addon: "Private Vehicle Upgrade", price: "on_request", sortOrder: 30, description: "A premium SUV (e.g. Toyota Prado) with your licensed guide instead of the standard vehicle." },
    ],
  },
];

/** Manali's live rows: kept (price/active untouched); only category + room occupancy set. */
const MANALI_KEEP: Record<string, { roomOccupancy?: number }> = {
  "Quad Sharing": { roomOccupancy: 4 },
  "Triple Sharing Upgrade": { roomOccupancy: 3 },
  "Double Sharing Upgrade": { roomOccupancy: 2 },
  "Airport Transfer": {},
};

// ----------------------------------------------------------------- runner

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

const log = (s: string) => console.log(s);
const fmtPrice = (p: Price) =>
  p === "on_request" ? "PRICE ON REQUEST" : `₹${p.rupees.toLocaleString("en-IN")} ${p.unit.replace(/_/g, " ")}`;

async function ensureMaster(spec: MasterSpec): Promise<string> {
  const existing = await prisma.addon.findFirst({
    where: { name: { equals: spec.name, mode: "insensitive" } },
    select: { id: true, category: true, description: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    const data: { category?: AddonCategory; description?: string } = {};
    if (existing.category !== spec.category) data.category = spec.category;
    // Replace only the earlier integration seed's placeholder text, never real copy.
    if (!existing.description || existing.description.startsWith("[TEST")) data.description = spec.description;
    if (Object.keys(data).length) {
      log(`  master  ${spec.name}: ${Object.keys(data).join(" + ")}`);
      if (APPLY) await prisma.addon.update({ where: { id: existing.id }, data });
    }
    return existing.id;
  }
  log(`  master  ${spec.name}: CREATE (${spec.category})`);
  if (!APPLY) return `dry-run:${spec.name}`;
  const created = await prisma.addon.create({
    data: { name: spec.name, description: spec.description, category: spec.category, active: true },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  log(`Target database host: ${dbHost()}`);
  if (APPLY) {
    if (!TARGET) throw new Error("--apply needs --target=<database host> (a guard against writing to the wrong database).");
    if (TARGET !== dbHost()) throw new Error(`--target=${TARGET} does not match DATABASE_URL host ${dbHost()}. Nothing written.`);
  }
  log(APPLY ? `APPLYING${PUBLISH ? " + PUBLISHING" : ""}…` : "DRY RUN — nothing is written. Use --apply --target=<host> to write.");

  // 1) Masters (create missing, set categories).
  const ids = new Map<string, string>();
  for (const m of MASTERS) ids.set(m.name, await ensureMaster(m));

  // 2) Trips.
  let created = 0;
  let updated = 0;
  for (const t of TRIPS) {
    const trip = await prisma.trip.findUnique({
      where: { slug: t.slug },
      select: { id: true, slug: true, durationDays: true, durationNights: true, baseRoomOccupancy: true, status: true, publicOptionsEnabled: true },
    });
    if (!trip) throw new Error(`Trip "${t.slug}" is not in the planner database — run the catalogue import first.`);
    log(`\n${t.slug}`);

    const tripData: Record<string, unknown> = {};
    if (trip.baseRoomOccupancy !== t.baseRoomOccupancy) tripData.baseRoomOccupancy = t.baseRoomOccupancy;
    if (trip.durationNights == null) tripData.durationNights = t.nights;
    if (trip.durationDays == null) tripData.durationDays = t.days;
    if (PUBLISH && t.slug !== "manali") {
      if (trip.status !== "active") tripData.status = "active";
      if (!trip.publicOptionsEnabled) tripData.publicOptionsEnabled = true;
    }
    if (Object.keys(tripData).length) {
      log(`  trip    ${JSON.stringify(tripData)}`);
      if (APPLY) await prisma.trip.update({ where: { id: trip.id }, data: tripData });
    }

    if (t.slug === "manali") {
      for (const [name, patch] of Object.entries(MANALI_KEEP)) {
        const addonId = ids.get(name)!;
        if (patch.roomOccupancy != null) {
          log(`  keep    ${name} (live price/active unchanged) · ${patch.roomOccupancy} per room`);
          if (APPLY) {
            await prisma.tripAddonOption.updateMany({
              where: { tripId: trip.id, addonId },
              data: { roomOccupancy: patch.roomOccupancy },
            });
          }
        } else {
          log(`  keep    ${name} (live price/active unchanged)`);
        }
      }
    }

    for (const o of t.options) {
      const addonId = ids.get(o.addon);
      if (!addonId) throw new Error(`Unknown master add-on "${o.addon}" in ${t.slug}.`);
      const onRequest = o.price === "on_request";
      const data = {
        active: true,
        sortOrder: o.sortOrder,
        isDefault: o.isDefault ?? false,
        isRecommended: o.isRecommended ?? false,
        priceOnRequest: onRequest,
        priceOverrideMinor: onRequest ? null : BigInt(Math.round((o.price as { rupees: number }).rupees * 100)),
        priceOverrideUnit: onRequest ? null : (o.price as { unit: PricingUnit }).unit,
        exclusiveGroup: o.group ?? null,
        descriptionOverride: o.description ?? null,
        availabilityNote: o.availabilityNote ?? null,
        roomOccupancy: o.roomOccupancy ?? null,
        note: onRequest ? NOTE_ON_REQUEST : NOTE_ESTIMATE,
      };
      const exists = APPLY || !addonId.startsWith("dry-run:")
        ? await prisma.tripAddonOption.findUnique({
            where: { tripId_addonId: { tripId: trip.id, addonId } },
            select: { tripId: true },
          })
        : null;
      log(`  ${exists ? "update" : "create"}  ${o.addon}: ${fmtPrice(o.price)}${o.isRecommended ? " · recommended" : ""}${o.group ? ` · group ${o.group}` : ""}`);
      if (exists) updated++;
      else created++;
      if (APPLY) {
        await prisma.tripAddonOption.upsert({
          where: { tripId_addonId: { tripId: trip.id, addonId } },
          create: { tripId: trip.id, addonId, ...data },
          update: data,
        });
      }
    }
  }

  log(`\n${APPLY ? "Done" : "Would do"}: ${created} customization(s) created, ${updated} updated, across ${TRIPS.length} trips.`);
  if (!PUBLISH) log("Trips were NOT published (no --publish). trip-le.com keeps its current behaviour for the 25 non-Manali packages.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
