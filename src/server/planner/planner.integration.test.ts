import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PlannerRequest } from "@/domain/planner/types";
import type * as PlannerService from "./planner.service";
import type { TripRepository } from "@/server/repositories";

/**
 * Full planner flow against a REAL database (skipped unless TEST_DATABASE_URL):
 * load config → calculate → save → read back → add a second version. Exercises
 * §37 (the worked example), §30 (independent versions) and internal-field gating.
 * Requires the dev seed to have run (uses the "Himachal Explorer" trip).
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const DB_TIMEOUT = 40_000;

describe.skipIf(!TEST_DB)("planner service (integration)", () => {
  let service: typeof PlannerService;
  let trips: TripRepository;
  let tripId: string;
  let request: PlannerRequest;
  const createdQuoteIds: string[] = [];
  let createdCustomerId: string | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    service = await import("./planner.service");
    trips = (await import("@/server/repositories")).tripRepository;

    const list = await trips.list({ q: "Himachal", filters: {}, page: 1, pageSize: 5 });
    const found = list.items[0];
    if (!found) throw new Error("Seed missing: run `npm run seed` before this test.");
    tripId = found.id;

    const config = await service.loadConfig(tripId);
    if (!config) throw new Error("loadConfig returned null");
    const acc = config.accommodations[0]!;
    const occupancy = acc.roomTypes.find((rt) => rt.active)!.occupancy;

    request = {
      customer: {
        name: "Integration Rahul",
        phone: `zz-itest-${Date.now().toString(36)}`,
      },
      tripId,
      travellerCount: 6,
      accommodation: { accommodationId: acc.id, occupancy },
      transportId: config.transport[0]?.id,
      activityIds: config.activities[0] ? [config.activities[0].id] : [],
      mealIds: config.meals[0] ? [config.meals[0].id] : [],
      addonIds: config.addons[0] ? [config.addons[0].id] : [],
    };
  }, DB_TIMEOUT);

  afterAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    for (const id of createdQuoteIds) await prisma.quote.deleteMany({ where: { id } });
    if (createdCustomerId) await prisma.customer.deleteMany({ where: { id: createdCustomerId } });
    await prisma.$disconnect();
  }, DB_TIMEOUT);

  it("calculates a deterministic, database-backed price + itinerary", async () => {
    const calc = await service.calculate(request, { includeInternal: true });
    expect(calc.ok).toBe(true);
    expect(calc.problems).toHaveLength(0);
    expect(calc.grandTotalMinor).toBeGreaterThan(0);
    expect(calc.allocation.rooms).toBeGreaterThanOrEqual(1);
    expect(calc.itinerary.days.length).toBeGreaterThan(0);
    // internal figures present for an authorised calculation
    expect(calc.internal).toBeDefined();
  }, DB_TIMEOUT);

  it("saves a frozen quote and reads it back", async () => {
    const saved = await service.save(request, { userId: null });
    expect(saved.ok).toBe(true);
    expect(saved.quoteId).toBeTruthy();
    expect(saved.reference).toMatch(/^TL-\d{4}-\d{6}$/);
    createdQuoteIds.push(saved.quoteId!);

    const { quoteStoreRepository, customerRepository } = await import("@/server/repositories");
    const byPhone = await customerRepository.findByPhone(request.customer.phone!);
    createdCustomerId = byPhone?.id;

    const withInternal = await quoteStoreRepository.findDetail(saved.quoteId!, {
      includeInternal: true,
    });
    expect(withInternal?.versions).toHaveLength(1);
    expect(withInternal?.versions[0]!.items.length).toBeGreaterThan(0);
    expect(withInternal?.versions[0]!.internal).toBeDefined();

    // Without permission, internal commercial fields must be absent (not just null).
    const publicView = await quoteStoreRepository.findDetail(saved.quoteId!, {
      includeInternal: false,
    });
    expect(publicView?.versions[0]!.internal).toBeUndefined();
    expect("supplierCostMinor" in publicView!.versions[0]!.items[0]!).toBe(false);
  }, DB_TIMEOUT);

  it("rejects an option the trip does not offer (§35, trip-option membership)", async () => {
    const { prisma } = await import("@/server/db/prisma");
    // Travel Insurance exists in the catalogue but is intentionally NOT enabled
    // for this trip by the seed.
    const disabled = await prisma.addon.findFirst({
      where: { name: "Travel Insurance" },
      select: { id: true },
    });
    if (!disabled) return; // seed variant without it — skip assertion
    const calc = await service.calculate(
      { ...request, addonIds: [disabled.id] },
      { includeInternal: true },
    );
    expect(calc.ok).toBe(false);
    expect(calc.problems.some((p) => /not an available option/i.test(p))).toBe(true);
  }, DB_TIMEOUT);

  it("keeps a saved quote immutable when master prices change (§18)", async () => {
    const saved = await service.save(request, { userId: null });
    createdQuoteIds.push(saved.quoteId!);
    const { prisma } = await import("@/server/db/prisma");
    const { quoteStoreRepository } = await import("@/server/repositories");

    const before = await quoteStoreRepository.findDetail(saved.quoteId!, { includeInternal: true });
    const originalTotal = before!.versions[0]!.grandTotalMinor;

    // Bump every accommodation price, then confirm the frozen quote is unchanged.
    const prices = await prisma.accommodationPrice.findMany({
      select: { id: true, amountMinor: true },
    });
    for (const p of prices)
      await prisma.accommodationPrice.update({
        where: { id: p.id },
        data: { amountMinor: p.amountMinor + 500000n },
      });
    try {
      const after = await quoteStoreRepository.findDetail(saved.quoteId!, { includeInternal: true });
      expect(after!.versions[0]!.grandTotalMinor).toBe(originalTotal);
    } finally {
      for (const p of prices)
        await prisma.accommodationPrice.update({
          where: { id: p.id },
          data: { amountMinor: p.amountMinor },
        });
    }
  }, DB_TIMEOUT);

  it("adds an independent second version (§30)", async () => {
    const first = await service.save(request, { userId: null });
    createdQuoteIds.push(first.quoteId!);

    const v2 = await service.save(
      { ...request, quoteId: first.quoteId, travellerCount: 4 },
      { userId: null },
    );
    expect(v2.ok).toBe(true);
    expect(v2.version).toBe(2);

    const { quoteStoreRepository } = await import("@/server/repositories");
    const detail = await quoteStoreRepository.findDetail(first.quoteId!, { includeInternal: true });
    expect(detail?.versions).toHaveLength(2);
    expect(detail?.versions[0]!.travellerCount).toBe(6);
    expect(detail?.versions[1]!.travellerCount).toBe(4);
    expect(detail?.currentVersion).toBe(2);
  }, DB_TIMEOUT);
});
