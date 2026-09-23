/**
 * Import the LIVE PUBLIC CATALOGUE (trip-le.com/tours) into the planner.
 *
 *   npm run import:catalogue -- --dry-run     preview, writes nothing
 *   npm run import:catalogue                  create the missing trips
 *
 * Safe to run repeatedly: trips are matched on SLUG (the public URL identifier)
 * and an existing trip is never duplicated and never overwritten. The single
 * exception is a purely additive backfill of `region` when it is still empty.
 * That is what protects the already-configured Manali trip (its customizations,
 * prices, itinerary, PDF and publicOptionsEnabled setting are untouched).
 *
 * Created trips are deliberately BARE catalogue entries:
 *   status                = draft   (no itinerary/pricing yet → not sellable)
 *   publicOptionsEnabled  = false   (trip-le.com keeps its current behaviour)
 *   no itinerary, no destinations, no customizations, no prices, no documents
 * Nothing is invented: only name, slug, region and the durations the public site
 * actually publishes. Where no duration is published, it stays NULL.
 *
 * SOURCE (snapshot): the catalogue is a static file on the website
 * (src/data/showcase-tours.ts), not a database table, so it is mirrored here.
 * Verified on 2026-09-23 against https://trip-le.com/tours — 26 packages.
 * The planner is the source of truth from here on; re-running never overwrites.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.slice(2).includes("--dry-run");

interface CatalogueEntry {
  slug: string;
  name: string;
  region: string;
  /** null = the public site publishes no duration for this package yet. */
  nights: number | null;
  days: number | null;
}

/** The 26 packages currently listed on trip-le.com/tours, in catalogue order. */
const PUBLIC_CATALOGUE: CatalogueEntry[] = [
  { slug: "manali", name: "Manali", region: "Himachal Pradesh", nights: 2, days: 3 },
  {
    slug: "manali-kasol-bir-billing",
    name: "Manali – Kasol – Bir Billing",
    region: "Himachal Pradesh",
    nights: 5,
    days: 6,
  },
  {
    slug: "dharamshala-mcleodganj",
    name: "Dharamshala – McLeod Ganj",
    region: "Himachal Pradesh",
    nights: 2,
    days: 3,
  },
  {
    slug: "kasol-kheerganga-trek",
    name: "Kasol – Kheerganga Trek",
    region: "Himachal Pradesh",
    nights: 2,
    days: 3,
  },
  {
    slug: "dehradun-mussoorie",
    name: "Dehradun – Mussoorie",
    region: "Uttarakhand",
    nights: 2,
    days: 3,
  },
  {
    slug: "haridwar-rishikesh",
    name: "Haridwar – Rishikesh",
    region: "Uttarakhand",
    nights: 2,
    days: 3,
  },
  {
    slug: "nainital-neem-karoli-jim-corbett",
    name: "Nainital – Neem Karoli Dham – Jim Corbett",
    region: "Uttarakhand",
    nights: 3,
    days: 4,
  },
  {
    slug: "udaipur-mount-abu-kumbhalgarh",
    name: "Udaipur – Mount Abu – Kumbhalgarh",
    region: "Rajasthan",
    nights: 3,
    days: 4,
  },
  { slug: "kumbhalgarh", name: "Kumbhalgarh", region: "Rajasthan", nights: 2, days: 3 },
  {
    slug: "udaipur-mount-abu",
    name: "Udaipur – Mount Abu",
    region: "Rajasthan",
    nights: 3,
    days: 4,
  },
  { slug: "jaisalmer", name: "Jaisalmer", region: "Rajasthan", nights: 2, days: 3 },
  {
    slug: "rajasthan-grand-circuit",
    name: "Rajasthan Grand Circuit",
    region: "Rajasthan",
    nights: 9,
    days: 10,
  },
  { slug: "goa", name: "Goa", region: "Goa", nights: 3, days: 4 },
  {
    slug: "phuket-krabi-koh-samui",
    name: "Phuket – Krabi – Koh Samui",
    region: "International",
    nights: 8,
    days: 9,
  },
  {
    slug: "phuket-krabi-bangkok",
    name: "Phuket – Krabi – Bangkok",
    region: "International",
    nights: 8,
    days: 9,
  },
  { slug: "phuket-krabi", name: "Phuket – Krabi", region: "International", nights: 5, days: 6 },
  { slug: "bali", name: "Bali, Indonesia", region: "International", nights: null, days: null },
  { slug: "maldives", name: "Maldives", region: "International", nights: null, days: null },
  { slug: "nepal", name: "Nepal", region: "International", nights: null, days: null },
  {
    slug: "singapore-malaysia",
    name: "Singapore & Malaysia",
    region: "International",
    nights: null,
    days: null,
  },
  { slug: "vietnam", name: "Vietnam", region: "International", nights: null, days: null },
  { slug: "dubai", name: "Dubai", region: "International", nights: 4, days: 5 },
  { slug: "bhutan", name: "Bhutan", region: "International", nights: 6, days: 7 },
  { slug: "kashmir", name: "Kashmir", region: "Kashmir", nights: 3, days: 4 },
  {
    slug: "meghalaya-arunachal",
    name: "Meghalaya & Arunachal Pradesh",
    region: "North East India",
    nights: null,
    days: null,
  },
  {
    slug: "sikkim-darjeeling",
    name: "Sikkim & Darjeeling",
    region: "North East India",
    nights: null,
    days: null,
  },
];

type Outcome = "created" | "matched" | "conflict";
interface Row {
  slug: string;
  name: string;
  outcome: Outcome;
  detail: string;
}

async function main() {
  const existing = await prisma.trip.findMany({
    select: { id: true, slug: true, name: true, region: true },
  });
  const bySlug = new Map(existing.map((t) => [t.slug, t]));

  console.log(
    `Public catalogue: ${PUBLIC_CATALOGUE.length} packages · planner: ${existing.length} trips` +
      `${DRY_RUN ? "  [DRY RUN — no writes]" : ""}\n`,
  );

  const rows: Row[] = [];
  const notes: string[] = [];
  let regionBackfills = 0;

  for (const entry of PUBLIC_CATALOGUE) {
    const match = bySlug.get(entry.slug);
    if (match) {
      // The ONLY write to an existing trip: fill in the public grouping when it
      // has none. Purely additive — it can never overwrite an existing value,
      // and it touches nothing else (customizations, prices, itinerary, PDF and
      // publicOptionsEnabled are all left exactly as they are).
      const backfillRegion = match.region == null;
      if (backfillRegion) {
        regionBackfills++;
        if (!DRY_RUN) {
          await prisma.trip.update({ where: { id: match.id }, data: { region: entry.region } });
        }
      }
      rows.push({
        slug: entry.slug,
        name: entry.name,
        outcome: "matched",
        detail:
          `already in planner as "${match.name}" — untouched` +
          (backfillRegion ? `, region set to "${entry.region}" (was empty)` : ""),
      });
      continue;
    }

    if (!DRY_RUN) {
      await prisma.trip.create({
        data: {
          name: entry.name,
          slug: entry.slug,
          region: entry.region,
          durationDays: entry.days,
          durationNights: entry.nights,
          // A bare catalogue entry: not sellable until it is configured.
          status: "draft",
          publicOptionsEnabled: false,
        },
      });
    }
    rows.push({
      slug: entry.slug,
      name: entry.name,
      outcome: "created",
      detail:
        `${entry.region} · ` +
        (entry.nights == null
          ? "duration not published (left blank)"
          : `${entry.nights}N / ${entry.days}D`),
    });
    if (entry.nights == null)
      notes.push(`${entry.slug}: no duration published — left NULL, not invented`);
  }

  const count = (o: Outcome) => rows.filter((r) => r.outcome === o).length;
  const mark = { created: "+", matched: "=", conflict: "!" } as const;

  let region = "";
  for (const r of rows) {
    const entry = PUBLIC_CATALOGUE.find((e) => e.slug === r.slug)!;
    if (entry.region !== region) {
      region = entry.region;
      console.log(`  ${region}`);
    }
    console.log(`   ${mark[r.outcome]} ${r.name}\n       ${r.slug} — ${r.detail}`);
  }

  const after = await prisma.trip.count();
  console.log(
    `\nPublic catalogue import ${DRY_RUN ? "preview" : "complete"}.\n` +
      `  Total public packages: ${PUBLIC_CATALOGUE.length}\n` +
      `  Matched (untouched):   ${count("matched")}\n` +
      `  Created:               ${count("created")}\n` +
      `  Updated:               ${regionBackfills}  (region backfilled on an empty field only)\n` +
      `  Conflicts:             ${count("conflict")}\n` +
      `  Planner trips now:     ${DRY_RUN ? `${after} (unchanged — dry run)` : after}`,
  );
  if (notes.length) {
    console.log("\nNotes:");
    for (const n of notes) console.log(`  · ${n}`);
  }
  console.log(
    "\nCreated trips are catalogue placeholders: draft status, no itinerary,\n" +
      "no customizations, no prices, no PDF, and publicOptionsEnabled = false, so\n" +
      "trip-le.com's booking behaviour is completely unchanged.",
  );
  if (count("conflict") > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
