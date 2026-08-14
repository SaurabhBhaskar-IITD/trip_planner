import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findPricingConflict } from "@/domain/pricing/validity";
import type {
  AccommodationRepository,
  PricingRepository,
  DestinationRepository,
} from "./ports/catalogue.repositories";

/**
 * Repository integration test — runs against a REAL Postgres database.
 *
 * Skipped unless TEST_DATABASE_URL is set (CI without a DB stays green). To run:
 * point TEST_DATABASE_URL at a Neon branch with the schema applied, then
 *   TEST_DATABASE_URL=... npm test
 *
 * Exercises the accommodation → room type → price chain plus the shared pricing
 * repository, internal-field gating, and overlap conflict detection.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
// Neon serverless over the pooler has high per-query latency; these tests make
// several sequential round-trips, so the default 5s timeout is too tight.
const DB_TIMEOUT = 30_000;

describe.skipIf(!TEST_DB)("catalogue + pricing repositories (integration)", () => {
  const suffix = Date.now().toString(36);
  let destinations: DestinationRepository;
  let accommodations: AccommodationRepository;
  let pricing: PricingRepository;
  let destinationId: string;
  let accommodationId: string;
  let roomTypeId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    destinations = (await import("./prisma/destination.repository")).destinationRepository;
    accommodations = (await import("./prisma/accommodation.repository")).accommodationRepository;
    pricing = (await import("./prisma/pricing.repository")).pricingRepository;

    const dest = await destinations.create({
      name: `ITest Dest ${suffix}`,
      slug: `zz-itest-cat-${suffix}`,
      region: "Test",
      country: "India",
      description: "integration",
      active: true,
    });
    destinationId = dest.id;
  }, DB_TIMEOUT);

  afterAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    if (accommodationId) await prisma.accommodation.deleteMany({ where: { id: accommodationId } });
    if (destinationId) await prisma.destination.deleteMany({ where: { id: destinationId } });
    await prisma.$disconnect();
  }, DB_TIMEOUT);

  it("creates accommodation → room type → price and gates internal fields", async () => {
    const acc = await accommodations.create({
      name: `ITest Hotel ${suffix}`,
      destinationId,
      category: "deluxe",
      starRating: 3,
      description: "integration",
      amenities: ["WiFi"],
      active: true,
    });
    accommodationId = acc.id;

    const rt = await accommodations.addRoomType(acc.id, {
      name: "Deluxe Room",
      occupancy: "double",
      category: "deluxe",
      maxOccupancy: 3,
      active: true,
    });
    roomTypeId = rt.id;

    await pricing.create("accommodation", rt.id, {
      amountMinor: 450000,
      supplierCostMinor: 320000,
      unit: "per_room_per_night",
      season: "peak",
      validFrom: null,
      validUntil: null,
      minPax: null,
      maxPax: null,
      active: true,
    });

    const withInternal = await accommodations.findDetail(acc.id, { includeInternal: true });
    const priceI = withInternal!.roomTypes[0]!.prices[0]!;
    expect(priceI.amountMinor).toBe(450000);
    expect(priceI.supplierCostMinor).toBe(320000);

    const withoutInternal = await accommodations.findDetail(acc.id, { includeInternal: false });
    const priceP = withoutInternal!.roomTypes[0]!.prices[0]!;
    expect(priceP.amountMinor).toBe(450000);
    // Field must be entirely absent for unauthorised callers, not just null.
    expect("supplierCostMinor" in priceP).toBe(false);
  }, DB_TIMEOUT);

  it("detects an overlapping active price via listWindows", async () => {
    const windows = await pricing.listWindows("accommodation", roomTypeId);
    const conflict = findPricingConflict(
      {
        unit: "per_room_per_night",
        season: "peak",
        validFrom: null,
        validUntil: null,
        active: true,
      },
      windows,
    );
    expect(conflict).not.toBeNull();
  }, DB_TIMEOUT);

  it("roomTypeParent resolves the owning accommodation", async () => {
    expect(await accommodations.roomTypeParent(roomTypeId)).toBe(accommodationId);
  }, DB_TIMEOUT);
});
