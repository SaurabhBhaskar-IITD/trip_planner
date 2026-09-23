import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as PrismaModule from "@/server/db/prisma";
import type * as CatalogService from "./public-catalog.service";
import type * as Repositories from "@/server/repositories";

/**
 * Planner-side publishing against a REAL database (skipped unless
 * TEST_DATABASE_URL). Uses a disposable trip + add-ons so real trips (Manali)
 * and their document version numbers are never touched. Cleans up after itself.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
const T = 60_000;

describe.skipIf(!TEST_DB)("public catalog + itinerary documents (integration)", () => {
  const suffix = Date.now().toString(36);
  const slug = `zz-itest-pub-${suffix}`;
  let prisma: typeof PrismaModule.prisma;
  let getPublicTripOptions: typeof CatalogService.getPublicTripOptions;
  let repos: typeof Repositories;
  let tripId = "";
  let rafting = "";
  let otherTripAddon = "";
  let otherTripId = "";

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    prisma = (await import("@/server/db/prisma")).prisma;
    getPublicTripOptions = (await import("./public-catalog.service")).getPublicTripOptions;
    repos = await import("@/server/repositories");

    tripId = (await prisma.trip.create({ data: { name: "ITest Publish", slug, durationDays: 3, durationNights: 2, status: "active", publicOptionsEnabled: true } })).id;
    otherTripId = (await prisma.trip.create({ data: { name: "ITest Other", slug: `${slug}-other`, durationDays: 2, durationNights: 1, status: "active" } })).id;

    // Master add-on WITH an internal supplier cost — must never surface publicly.
    rafting = (
      await prisma.addon.create({
        data: {
          name: `ITest Rafting ${suffix}`,
          description: "Adventure on the river",
          prices: { create: { amountMinor: 150_000n, unit: "per_person", supplierCostMinor: 90_000n, season: "all" } },
        },
      })
    ).id;
    otherTripAddon = (
      await prisma.addon.create({ data: { name: `ITest Other ${suffix}`, prices: { create: { amountMinor: 50_000n, unit: "fixed" } } } })
    ).id;
    await prisma.tripAddonOption.create({ data: { tripId: otherTripId, addonId: otherTripAddon, active: true } });
  }, T);

  afterAll(async () => {
    await prisma.itineraryDocument.deleteMany({ where: { tripId: { in: [tripId, otherTripId] } } });
    await prisma.trip.deleteMany({ where: { id: { in: [tripId, otherTripId] } } });
    await prisma.addon.deleteMany({ where: { id: { in: [rafting, otherTripAddon] } } });
    await prisma.$disconnect();
  }, T);

  const names = async () => {
    const r = await getPublicTripOptions(slug);
    return r.status === "ok" ? r.data.options.map((o) => o.name) : r.status;
  };

  it("attach creates an INACTIVE customization that is not public yet", async () => {
    await repos.tripCustomizationRepository.attach(tripId, rafting, null);
    expect(await names()).toEqual([]);
  }, T);

  it("planner can ACTIVATE → it appears publicly", async () => {
    await repos.tripCustomizationRepository.setActive(tripId, rafting, true, "admin-user");
    expect(await names()).toEqual([`ITest Rafting ${suffix}`]);
    const row = await prisma.tripAddonOption.findUniqueOrThrow({ where: { tripId_addonId: { tripId, addonId: rafting } } });
    expect(row.updatedById).toBe("admin-user"); // audit trail
  }, T);

  it("the public payload contains NO internal fields (supplier cost, margin, notes)", async () => {
    const r = await getPublicTripOptions(slug);
    // Collect every FIELD NAME in the payload (values are customer text and may
    // legitimately contain any word).
    const keys = new Set<string>();
    const walk = (v: unknown) => {
      if (!v || typeof v !== "object") return;
      for (const [k, child] of Object.entries(v)) {
        keys.add(k);
        walk(child);
      }
    };
    walk(r);
    const internal = [...keys].filter((k) => /supplier|margin|cost|internal|note|updated|created|blob|pathname/i.test(k));
    expect(internal).toEqual([]);
    expect(JSON.stringify(r)).not.toContain("90000"); // the supplier cost value itself
    expect(r.status === "ok" && r.data.options[0]).toMatchObject({ priceMinor: 150_000, chargeBasis: "per_person" });
  }, T);

  it("a trip-specific price override replaces the catalogue price and changes the config version", async () => {
    const before = await getPublicTripOptions(slug);
    await repos.tripCustomizationRepository.update(tripId, rafting, { priceOverride: { amountMinor: 200_000, unit: "per_person" } }, null);
    const after = await getPublicTripOptions(slug);
    expect(after.status === "ok" && after.data.options[0]!.priceMinor).toBe(200_000);
    expect(before.status === "ok" && after.status === "ok" && before.data.configVersion !== after.data.configVersion).toBe(true);
  }, T);

  it("planner can DEACTIVATE → it disappears publicly, and the override is preserved", async () => {
    await repos.tripCustomizationRepository.setActive(tripId, rafting, false, null);
    expect(await names()).toEqual([]);
    const row = await prisma.tripAddonOption.findUniqueOrThrow({ where: { tripId_addonId: { tripId, addonId: rafting } } });
    expect(row.priceOverrideMinor).toBe(200_000n);
  }, T);

  it("another trip's add-on never appears on this trip", async () => {
    await repos.tripCustomizationRepository.setActive(tripId, rafting, true, null);
    expect(await names()).not.toContain(`ITest Other ${suffix}`);
  }, T);

  it("a trip the planner does not OWN is reported as unknown, so the website keeps its own add-ons", async () => {
    await prisma.trip.update({ where: { id: tripId }, data: { publicOptionsEnabled: false } });
    // `not_found` (not `unpublished`) is what makes trip-le.com fall back to its
    // existing behaviour instead of blocking booking.
    expect((await getPublicTripOptions(slug)).status).toBe("not_found");
    await prisma.trip.update({ where: { id: tripId }, data: { publicOptionsEnabled: true } });
  }, T);

  it("an unpublished trip is not served at all", async () => {
    await prisma.trip.update({ where: { id: tripId }, data: { status: "draft" } });
    expect((await getPublicTripOptions(slug)).status).toBe("unpublished");
    await prisma.trip.update({ where: { id: tripId }, data: { status: "active" } });
  }, T);

  it("replacing the PDF creates a NEW version; v1 is untouched and still resolvable", async () => {
    const docRepo = repos.itineraryDocumentRepository;
    const v1 = await docRepo.createNextVersion(tripId, { fileName: "a.pdf", blobPathname: `itest/${suffix}/a.pdf`, sizeBytes: 10, sha256: "a".repeat(64), contentType: "application/pdf" }, null);
    const v2 = await docRepo.createNextVersion(tripId, { fileName: "b.pdf", blobPathname: `itest/${suffix}/b.pdf`, sizeBytes: 20, sha256: "b".repeat(64), contentType: "application/pdf" }, null);
    expect([v1.version, v2.version]).toEqual([1, 2]);

    // New bookings get the CURRENT version…
    expect((await docRepo.currentStorageBySlug(slug))?.version).toBe(2);
    // …while v1 (what an earlier booking froze) is unchanged.
    const stillV1 = await docRepo.findStorage(v1.id);
    expect(stillV1).toMatchObject({ version: 1, fileName: "a.pdf", blobPathname: `itest/${suffix}/a.pdf` });
  }, T);

  it("concurrent replacements never produce duplicate version numbers", async () => {
    const docRepo = repos.itineraryDocumentRepository;
    const results = await Promise.all(
      [1, 2, 3].map((i) =>
        docRepo.createNextVersion(tripId, { fileName: `c${i}.pdf`, blobPathname: `itest/${suffix}/c${i}.pdf`, sizeBytes: 1, sha256: "c".repeat(64), contentType: "application/pdf" }, null),
      ),
    );
    const versions = results.map((r) => r.version).sort();
    expect(new Set(versions).size).toBe(3);
  }, T);
});
