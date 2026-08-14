import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findPricingConflict } from "@/domain/pricing/validity";
import type {
  ActivityRepository,
  AddonRepository,
  MealRepository,
  PricingRepository,
  TransportationRepository,
} from "./ports/catalogue.repositories";
import { parseListQuery } from "./query";

/**
 * Live CRUD across transport / activity / meal / add-on + the shared pricing
 * repository. Skipped unless TEST_DATABASE_URL is set. Complements the
 * accommodation-focused catalogue.integration test. Cleans up after itself.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const DB_TIMEOUT = 30_000;

describe.skipIf(!TEST_DB)("module CRUD + shared pricing (integration)", () => {
  let transport: TransportationRepository;
  let activity: ActivityRepository;
  let meal: MealRepository;
  let addon: AddonRepository;
  let pricing: PricingRepository;
  const ids: { transport?: string; activity?: string; meal?: string; addon?: string } = {};

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    transport = (await import("./prisma/transportation.repository")).transportationRepository;
    activity = (await import("./prisma/activity.repository")).activityRepository;
    meal = (await import("./prisma/meal.repository")).mealRepository;
    addon = (await import("./prisma/addon.repository")).addonRepository;
    pricing = (await import("./prisma/pricing.repository")).pricingRepository;
  }, DB_TIMEOUT);

  afterAll(async () => {
    const { prisma } = await import("@/server/db/prisma");
    if (ids.transport) await prisma.transportation.deleteMany({ where: { id: ids.transport } });
    if (ids.activity) await prisma.activity.deleteMany({ where: { id: ids.activity } });
    if (ids.meal) await prisma.meal.deleteMany({ where: { id: ids.meal } });
    if (ids.addon) await prisma.addon.deleteMany({ where: { id: ids.addon } });
    await prisma.$disconnect();
  }, DB_TIMEOUT);

  it(
    "transport: create → search+modeFilter → update → deactivate → price CRUD + conflict",
    async () => {
      const t = await transport.create({
        name: "ZZ-CRUD Tempo",
        mode: "tempo_traveller",
        provider: "Test Co",
        vehicleType: "AC",
        capacity: 12,
        routeFrom: "A",
        routeTo: "B",
        active: true,
      });
      ids.transport = t.id;

      const list = await transport.list(
        parseListQuery({ q: "ZZ-CRUD", mode: "tempo_traveller" }, { filterKeys: ["mode"] }),
      );
      expect(list.items.some((x) => x.id === t.id)).toBe(true);

      await transport.update(t.id, {
        name: "ZZ-CRUD Tempo v2",
        mode: "tempo_traveller",
        provider: "Test Co",
        vehicleType: "AC",
        capacity: 14,
        routeFrom: "A",
        routeTo: "B",
        active: true,
      });
      await transport.setActive(t.id, false);
      const afterUpdate = await transport.findDetail(t.id, { includeInternal: true });
      expect(afterUpdate?.name).toBe("ZZ-CRUD Tempo v2");
      expect(afterUpdate?.capacity).toBe(14);
      expect(afterUpdate?.active).toBe(false);

      const tp = await pricing.create("transportation", t.id, {
        amountMinor: 800000,
        supplierCostMinor: 600000,
        unit: "per_vehicle",
        season: "all",
        validFrom: null,
        validUntil: null,
        minPax: null,
        maxPax: null,
        active: true,
      });

      const windows = await pricing.listWindows("transportation", t.id);
      expect(
        findPricingConflict(
          { unit: "per_vehicle", season: "all", validFrom: null, validUntil: null, active: true },
          windows,
        ),
      ).not.toBeNull();

      await pricing.update("transportation", tp.id, {
        amountMinor: 850000,
        supplierCostMinor: 610000,
        unit: "per_vehicle",
        season: "all",
        validFrom: null,
        validUntil: null,
        minPax: null,
        maxPax: null,
        active: true,
      });
      const stripped = await transport.findDetail(t.id, { includeInternal: false });
      expect(stripped?.prices[0]?.amountMinor).toBe(850000);
      expect("supplierCostMinor" in (stripped?.prices[0] ?? {})).toBe(false);

      await pricing.delete("transportation", tp.id);
      expect((await pricing.listWindows("transportation", t.id)).length).toBe(0);
    },
    DB_TIMEOUT,
  );

  it(
    "activity / meal / addon: create + price via shared pricing repo",
    async () => {
      const a = await activity.create({
        name: "ZZ-CRUD Paraglide",
        type: "adventure",
        destinationId: "",
        description: "x",
        durationMinutes: 30,
        active: true,
      });
      ids.activity = a.id;
      await pricing.create("activity", a.id, {
        amountMinor: 180000,
        supplierCostMinor: 120000,
        unit: "per_person",
        season: "all",
        validFrom: null,
        validUntil: null,
        minPax: null,
        maxPax: null,
        active: true,
      });
      expect(
        (await activity.findDetail(a.id, { includeInternal: true }))?.prices[0]?.supplierCostMinor,
      ).toBe(120000);

      const m = await meal.create({
        name: "ZZ-CRUD MAP",
        mealType: "dinner",
        plan: "MAP",
        active: true,
      });
      ids.meal = m.id;
      await pricing.create("meal", m.id, {
        amountMinor: 70000,
        supplierCostMinor: null,
        unit: "per_person_per_night",
        season: "all",
        validFrom: null,
        validUntil: null,
        minPax: null,
        maxPax: null,
        active: true,
      });
      expect((await meal.findDetail(m.id, { includeInternal: true }))?.prices.length).toBe(1);

      const ad = await addon.create({ name: "ZZ-CRUD Guide", description: "x", active: true });
      ids.addon = ad.id;
      await pricing.create("addon", ad.id, {
        amountMinor: 200000,
        supplierCostMinor: 140000,
        unit: "per_day",
        season: "all",
        validFrom: null,
        validUntil: null,
        minPax: null,
        maxPax: null,
        active: true,
      });
      expect((await addon.findDetail(ad.id, { includeInternal: true }))?.prices.length).toBe(1);
    },
    DB_TIMEOUT,
  );
});
