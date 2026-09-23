/**
 * Manali — TEST customization baseline for the planner ↔ trip-le.com integration.
 *
 * Idempotent: re-running resets ONLY the Manali customization rows defined here
 * to this baseline. It never touches other trips, bookings or quotes.
 *
 * Price provenance (nothing invented):
 *   - Room sharing (quad included / triple +₹1,000 / double +₹2,000 per person)
 *     mirrors the prices trip-le.com charges for Manali TODAY (it was hard-coded
 *     in the website's checkout constants), so checkout behaviour is unchanged.
 *   - River Rafting ₹1,500/person, Snow Activities ₹2,000/person and Airport
 *     Transfer ₹1,500 are the example figures from the integration brief. They
 *     are TEST prices — confirm real values before production.
 *   - Private Vehicle Upgrade has no agreed price: attached INACTIVE, unpriced.
 *   - Extra Night reuses its catalogue price (per room per night), which cannot
 *     be sold online yet: attached INACTIVE to demonstrate that guard.
 *
 * Run: npx tsx prisma/scripts/manali-customizations.ts
 */
import { PrismaClient, type PricingUnit } from "@prisma/client";

const prisma = new PrismaClient();
const TEST_TAG = "[TEST — Manali integration customization]";

interface Spec {
  addon: string;
  /** Create the master add-on if it does not exist (else reuse the catalogue one). */
  create: boolean;
  description: string;
  active: boolean;
  sortOrder: number;
  group?: string;
  isDefault?: boolean;
  price?: { rupees: number; unit: PricingUnit };
}

const SPECS: Spec[] = [
  { addon: "Quad Sharing", create: true, description: "Included — four travellers to a room, the base package configuration.", active: true, sortOrder: 10, group: "sharing", isDefault: true, price: { rupees: 0, unit: "per_person" } },
  { addon: "Triple Sharing Upgrade", create: true, description: "Three travellers to a room.", active: true, sortOrder: 20, group: "sharing", price: { rupees: 1000, unit: "per_person" } },
  { addon: "Double Sharing Upgrade", create: true, description: "Two travellers to a room.", active: true, sortOrder: 30, group: "sharing", price: { rupees: 2000, unit: "per_person" } },
  { addon: "River Rafting", create: true, description: "Optional adventure activity on the Beas river.", active: true, sortOrder: 40, price: { rupees: 1500, unit: "per_person" } },
  { addon: "Snow Activities", create: true, description: "Snow play and activities at Solang / Sissu (season permitting).", active: true, sortOrder: 50, price: { rupees: 2000, unit: "per_person" } },
  { addon: "Airport Transfer", create: false, description: "Private pickup from Bhuntar airport to your Manali hotel.", active: true, sortOrder: 60, price: { rupees: 1500, unit: "fixed" } },
  { addon: "Private Vehicle Upgrade", create: true, description: "A private vehicle for your group instead of the shared tempo traveller.", active: false, sortOrder: 70 },
  { addon: "Extra Night", create: false, description: "Extend your stay by one night.", active: false, sortOrder: 80 },
];

async function main() {
  const trip = await prisma.trip.findUnique({ where: { slug: "manali" }, select: { id: true, name: true } });
  if (!trip) throw new Error('Trip "manali" not found in the planner database.');

  for (const s of SPECS) {
    let addon = await prisma.addon.findFirst({ where: { name: s.addon }, select: { id: true } });
    if (!addon) {
      if (!s.create) throw new Error(`Catalogue add-on "${s.addon}" is missing.`);
      addon = await prisma.addon.create({ data: { name: s.addon, description: TEST_TAG, active: true }, select: { id: true } });
    }

    const config = {
      active: s.active,
      sortOrder: s.sortOrder,
      exclusiveGroup: s.group ?? null,
      isDefault: s.isDefault ?? false,
      descriptionOverride: s.description,
      priceOverrideMinor: s.price ? BigInt(Math.round(s.price.rupees * 100)) : null,
      priceOverrideUnit: s.price?.unit ?? null,
    };
    await prisma.tripAddonOption.upsert({
      where: { tripId_addonId: { tripId: trip.id, addonId: addon.id } },
      create: { tripId: trip.id, addonId: addon.id, ...config },
      update: config,
    });
    const priceText = s.price ? `₹${s.price.rupees} ${s.price.unit}` : "no trip price";
    console.log(`✔ ${s.active ? "ACTIVE  " : "inactive"}  ${s.addon.padEnd(24)} ${priceText}`);
  }
  console.log(`\nManali (${trip.id}) customization baseline applied.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
