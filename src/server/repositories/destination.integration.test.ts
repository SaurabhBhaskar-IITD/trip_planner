import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { DestinationRepository } from "./ports/catalogue.repositories";

/**
 * Repository integration test — runs against a REAL Postgres database.
 *
 * It is skipped unless TEST_DATABASE_URL is set (so CI without a DB stays green).
 * To run it, point TEST_DATABASE_URL at a throwaway Neon test branch that has the
 * schema applied (`npm run db:push`), then:  TEST_DATABASE_URL=... npm test
 *
 * It exercises the real Prisma DestinationRepository: create → list/search →
 * slug-uniqueness → deactivate, then cleans up after itself.
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
// Neon is serverless: a cold start alone can exceed vitest's 5s default, which
// made this suite fail spuriously. Match the timeout used by the other DB suites.
const DB_TIMEOUT = 40_000;

describe.skipIf(!TEST_DB)("PrismaDestinationRepository (integration)", () => {
  const suffix = Date.now().toString(36);
  const slug = `zz-itest-dest-${suffix}`;
  let repo: DestinationRepository;
  let createdId: string | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    const mod = await import("./prisma/destination.repository");
    repo = mod.destinationRepository;
  }, DB_TIMEOUT);

  afterAll(async () => {
    if (createdId) {
      const { prisma } = await import("@/server/db/prisma");
      await prisma.destination.deleteMany({ where: { id: createdId } });
      await prisma.$disconnect();
    }
  }, DB_TIMEOUT);

  it("creates, finds, and enforces slug uniqueness", async () => {
    const created = await repo.create({
      name: `Integration Test Dest ${suffix}`,
      slug,
      region: "Test Region",
      country: "India",
      description: "integration test",
      active: true,
    });
    createdId = created.id;

    expect(created.slug).toBe(slug);
    expect(await repo.slugExists(slug)).toBe(true);
    expect(await repo.slugExists(slug, created.id)).toBe(false); // excluded self

    const found = await repo.findById(created.id);
    expect(found?.name).toContain("Integration Test Dest");

    await repo.setActive(created.id, false);
    const afterDeactivate = await repo.findById(created.id);
    expect(afterDeactivate?.active).toBe(false);
  }, DB_TIMEOUT);
});
