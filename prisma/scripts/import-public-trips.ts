/**
 * Import the PUBLIC trip catalogue (trip-le.com) into the planner.
 *
 *   npm run import:trips -- --dry-run     preview, writes nothing
 *   npm run import:trips                  create the missing trips
 *
 * Safe to run repeatedly. Trips are matched on SLUG — the stable public
 * identifier that URLs depend on. A trip that already exists in the planner is
 * SKIPPED ENTIRELY: this is a one-way initial import, and the planner is the
 * source of truth from here on, so an existing trip's name, status, itinerary
 * or customizations are never overwritten (that is also what keeps Manali's
 * configuration and its itinerary PDF intact).
 *
 * Newly imported trips get `publicOptionsEnabled = false`, so trip-le.com keeps
 * using its own built-in add-ons for them and NOTHING changes for customers
 * until each trip is switched over deliberately in the planner.
 *
 * Reads the public database READ-ONLY over plain SQL (the website's schema is a
 * separate Prisma project; the planner must not depend on it). Writes go
 * through PrismaClient, following the convention of prisma/seed.ts — scripts run
 * outside the Next runtime, where repository modules are blocked by `server-only`.
 */
import { PrismaClient, type TripStatus } from "@prisma/client";
import { Client } from "pg";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.slice(2).includes("--dry-run");

/** Public PackageStatus → planner TripStatus (planner's existing model, no new states). */
const STATUS_MAP: Record<string, TripStatus> = {
  PUBLISHED: "active",
  DRAFT: "draft",
  ARCHIVED: "archived",
  // Postponed publicly: not bookable, but not retired either → draft.
  DEFERRED: "draft",
};

interface PublicTour {
  slug: string;
  name: string;
  status: string;
  days: number;
  nights: number;
  shortDesc: string | null;
  longDesc: string | null;
}

interface PublicDay {
  slug: string;
  dayNumber: number;
  title: string;
  morning: string | null;
  afternoon: string | null;
  evening: string | null;
  night: string | null;
  travelTime: string | null;
  distance: string | null;
  notes: string | null;
  warnings: string | null;
}

/**
 * The public day is narrated in separate time-of-day columns; the planner day
 * has one summary. Join them in order under their own labels — nothing is
 * invented and nothing is dropped.
 */
function composeDaySummary(d: PublicDay): string | null {
  const parts: string[] = [];
  const add = (label: string, text: string | null) => {
    if (text && text.trim()) parts.push(`${label}: ${text.trim()}`);
  };
  add("Morning", d.morning);
  add("Afternoon", d.afternoon);
  add("Evening", d.evening);
  add("Night", d.night);
  const facts = [
    d.travelTime ? `Travel time: ${d.travelTime}` : null,
    d.distance ? `Distance: ${d.distance}` : null,
  ].filter(Boolean);
  if (facts.length) parts.push(facts.join(" · "));
  add("Note", d.notes);
  add("Please note", d.warnings);
  return parts.length ? parts.join("\n") : null;
}

async function readPublicCatalogue(): Promise<{ tours: PublicTour[]; days: Map<string, PublicDay[]> }> {
  const url = process.env.PUBLIC_SITE_DATABASE_URL;
  if (!url) {
    throw new Error(
      "PUBLIC_SITE_DATABASE_URL is not set. Point it at the trip-le.com database (read-only use).",
    );
  }
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    const tours = await client.query<PublicTour>(
      `select slug, name, status, days, nights, "shortDesc", "longDesc"
         from "Tour" where "deletedAt" is null order by slug`,
    );
    const days = await client.query<PublicDay>(
      `select t.slug, d."dayNumber", d.title, d.morning, d.afternoon, d.evening, d.night,
              d."travelTime", d.distance, d.notes, d.warnings
         from "ItineraryDay" d
         join "Itinerary" i on i.id = d."itineraryId"
         join "Tour" t on t.id = i."tourId"
        where t."deletedAt" is null
        order by t.slug, d."dayNumber"`,
    );
    const byTour = new Map<string, PublicDay[]>();
    for (const d of days.rows) {
      const list = byTour.get(d.slug) ?? [];
      list.push(d);
      byTour.set(d.slug, list);
    }
    return { tours: tours.rows, days: byTour };
  } finally {
    await client.end();
  }
}

type Outcome = "created" | "matched" | "conflict";
interface Row {
  slug: string;
  name: string;
  outcome: Outcome;
  detail: string;
}

async function main() {
  const { tours, days } = await readPublicCatalogue();
  const plannerTrips = await prisma.trip.findMany({ select: { id: true, slug: true, name: true } });
  const bySlug = new Map(plannerTrips.map((t) => [t.slug, t]));
  const byName = new Map(plannerTrips.map((t) => [t.name.trim().toLowerCase(), t]));

  console.log(
    `Public catalogue: ${tours.length} trips · planner: ${plannerTrips.length} trips${DRY_RUN ? "  [DRY RUN — no writes]" : ""}\n`,
  );

  const rows: Row[] = [];
  /** Things imported faithfully but worth a human's attention afterwards. */
  const unmapped = new Set<string>();

  for (const tour of tours) {
    const publicDayCount = (days.get(tour.slug) ?? []).length;

    const existing = bySlug.get(tour.slug);
    if (existing) {
      rows.push({ slug: tour.slug, name: tour.name, outcome: "matched", detail: `existing planner trip "${existing.name}" — left untouched` });
      const plannerDayCount = await prisma.itineraryDay.count({ where: { tripId: existing.id } });
      if (plannerDayCount !== publicDayCount) {
        unmapped.add(
          `${tour.slug}: planner itinerary has ${plannerDayCount} day(s), the public site has ${publicDayCount} — left as-is (existing trips are never modified)`,
        );
      }
      continue;
    }

    // Faithfully imported, but worth knowing about: the public trip's declared
    // duration disagrees with how many itinerary days it actually has.
    if (publicDayCount !== tour.days) {
      unmapped.add(
        `${tour.slug}: public trip says ${tour.days} day(s) but has ${publicDayCount} itinerary day(s) — imported exactly as published`,
      );
    }

    // A same-named trip under a different slug is probably the same product.
    // Renaming a public slug would break live URLs, so STOP and report instead.
    const nameTwin = byName.get(tour.name.trim().toLowerCase());
    if (nameTwin) {
      rows.push({ slug: tour.slug, name: tour.name, outcome: "conflict", detail: `planner already has "${nameTwin.name}" under slug "${nameTwin.slug}" — resolve manually` });
      continue;
    }

    const status = STATUS_MAP[tour.status];
    if (!status) {
      rows.push({ slug: tour.slug, name: tour.name, outcome: "conflict", detail: `unknown public status "${tour.status}"` });
      continue;
    }

    const tourDays = days.get(tour.slug) ?? [];
    if (!DRY_RUN) {
      await prisma.trip.create({
        data: {
          name: tour.name,
          slug: tour.slug,
          summary: tour.shortDesc,
          description: tour.longDesc,
          durationDays: tour.days,
          durationNights: tour.nights,
          status,
          // Never claim a trip's public options on import — see file header.
          publicOptionsEnabled: false,
          itinerary: {
            create: tourDays.map((d) => ({
              dayNumber: d.dayNumber,
              title: d.title,
              summary: composeDaySummary(d),
            })),
          },
        },
      });
    }
    rows.push({
      slug: tour.slug,
      name: tour.name,
      outcome: "created",
      detail: `${status}${status !== "active" ? ` (public: ${tour.status})` : ""} · ${tourDays.length} itinerary day(s)`,
    });
    if (tour.status === "DEFERRED") unmapped.add(`${tour.slug}: public status DEFERRED imported as planner "draft"`);
  }

  const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length;
  const mark = { created: "+", matched: "=", conflict: "!" } as const;
  for (const r of rows) console.log(` ${mark[r.outcome]} ${r.name}\n     ${r.slug} — ${r.detail}`);

  console.log(
    `\nTrip catalogue import ${DRY_RUN ? "preview" : "complete"}.\n` +
      `  Existing (matched): ${count("matched")}\n` +
      `  Created:            ${count("created")}\n` +
      `  Updated:            0  (existing trips are never modified)\n` +
      `  Conflicts:          ${count("conflict")}`,
  );
  if (unmapped.size) {
    console.log("\nNotes:");
    for (const n of unmapped) console.log(`  · ${n}`);
  }
  console.log(
    "\nNOT imported (no planner field — needs manual entry or a later phase):\n" +
      "  base prices · hero/gallery images · highlights · inclusions/exclusions ·\n" +
      "  important notes · categories · FAQs · pickup/drop city · vehicle type ·\n" +
      "  difficulty · group sizes · destination links (the public database has no\n" +
      "  destination records at all) · per-day activities (none exist publicly).\n" +
      "\nImported trips do NOT control their customizations on trip-le.com yet:\n" +
      "  the website keeps its current behaviour until each trip is switched over.",
  );
  if (count("conflict") > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
