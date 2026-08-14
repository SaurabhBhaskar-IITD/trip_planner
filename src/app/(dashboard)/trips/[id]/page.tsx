import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ListOrdered, MapPin, Pencil } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  accommodationRepository,
  activityRepository,
  addonRepository,
  mealRepository,
  transportationRepository,
  tripRepository,
} from "@/server/repositories";
import { humanizeEnum } from "@/domain/shared/enums";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Trip detail" };

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed, user } = await guardPage("trip:read");
  if (!allowed) return <AccessDenied permission="trip:read" />;

  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const { id } = await params;
  const trip = await tripRepository.findDetail(id);
  if (!trip) notFound();

  const canWrite = can(user, "trip:write");
  const daysCount = trip.itinerary.length;
  const segmentCount = trip.itinerary.reduce((n, d) => n + d.segments.length, 0);

  // Master data available to this trip. Accommodations & activities relate to the
  // trip through its DESTINATIONS (the only trip↔catalogue link the schema has);
  // transport/meals/add-ons are a global catalogue. These are read-only "available
  // options" — curated per-trip selection needs new join tables (see report).
  const destinationIds = trip.destinations.map((d) => d.destinationId);
  const [tripAccommodations, tripActivities, transportOptions, mealOptions, addonOptions] =
    await Promise.all([
      accommodationRepository.listActiveByDestinations(destinationIds),
      activityRepository.listActiveByDestinations(destinationIds),
      transportationRepository.listActiveBrief(),
      mealRepository.listActiveBrief(),
      addonRepository.listActiveBrief(),
    ]);

  return (
    <>
      {/* Workspace header */}
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{trip.name}</h1>
            <StatusBadge status={trip.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {trip.durationDays} Days / {trip.durationNights} Nights · v{trip.version} ·{" "}
            <span className="font-mono text-xs">/{trip.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/trips">
              <ArrowLeft />
              Trips
            </Link>
          </Button>
          {canWrite ? (
            <Button asChild>
              <Link href={`/trips/${trip.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="meals">Meals</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {trip.summary ? <p className="font-medium">{trip.summary}</p> : null}
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {trip.description || "No description yet."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">At a glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Status" value={<StatusBadge status={trip.status} />} />
                <Row label="Duration" value={`${trip.durationDays}D / ${trip.durationNights}N`} />
                <Row label="Destinations" value={String(trip.destinations.length)} />
                <Row label="Itinerary days" value={String(daysCount)} />
                <Row label="Version" value={`v${trip.version}`} />
                <Row label="Updated" value={formatDate(trip.updatedAt)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="destinations">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Route ({trip.destinations.length})</CardTitle>
              {canWrite ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/trips/${trip.id}/edit`}>
                    <Pencil />
                    Edit route
                  </Link>
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              {trip.destinations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No destinations attached. Use Edit to add them in order.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {trip.destinations.map((d, i) => (
                    <span key={d.destinationId} className="flex items-center gap-1.5">
                      {i > 0 ? <span className="text-muted-foreground">→</span> : null}
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="size-3" />
                        {d.name}
                      </Badge>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itinerary">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">
                Itinerary — {daysCount} {daysCount === 1 ? "day" : "days"}, {segmentCount} segments
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/trips/${trip.id}/itinerary`}>
                  <ListOrdered />
                  {canWrite ? "Open editor" : "View itinerary"}
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {daysCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No itinerary yet. Open the editor to add days and ordered segments.
                </p>
              ) : (
                <ol className="space-y-1.5 text-sm">
                  {trip.itinerary.map((d) => (
                    <li key={d.id} className="flex items-baseline gap-2">
                      <span className="font-medium">Day {d.dayNumber}:</span>
                      <span className="text-muted-foreground">
                        {d.title}
                        {d.segments.length ? ` · ${d.segments.length} segments` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accommodation">
          <CatalogueTab
            title="Accommodation options"
            note="Active properties in this trip's destinations. Sourced from the shared catalogue — no duplicate records are created."
            emptyHint="No active properties in these destinations yet. Add some under Accommodations."
            items={tripAccommodations.map((a) => ({
              id: a.id,
              href: `/accommodations/${a.id}`,
              title: a.name,
              meta: [a.destinationName, humanizeEnum(a.category), `${a.roomTypeCount} room types`],
            }))}
          />
        </TabsContent>

        <TabsContent value="transport">
          <CatalogueTab
            title="Transport options"
            note="Active transport from the shared catalogue (global — not destination-scoped)."
            emptyHint="No active transport yet. Add some under Transport."
            items={transportOptions.map((t) => ({
              id: t.id,
              href: `/transport/${t.id}`,
              title: t.name,
              meta: [
                humanizeEnum(t.mode),
                t.routeFrom || t.routeTo ? `${t.routeFrom ?? "—"} → ${t.routeTo ?? "—"}` : null,
                `Capacity ${t.capacity}`,
              ],
            }))}
          />
        </TabsContent>

        <TabsContent value="activities">
          <CatalogueTab
            title="Activity options"
            note="Active activities in this trip's destinations (plus generic activities). Sourced from the shared catalogue."
            emptyHint="No active activities in these destinations yet. Add some under Activities."
            items={tripActivities.map((a) => ({
              id: a.id,
              href: `/activities/${a.id}`,
              title: a.name,
              meta: [humanizeEnum(a.type), a.destinationName],
            }))}
          />
        </TabsContent>

        <TabsContent value="meals">
          <CatalogueTab
            title="Meal options"
            note="Active meal plans from the shared catalogue (global)."
            emptyHint="No active meals yet. Add some under Meals."
            items={mealOptions.map((m) => ({
              id: m.id,
              href: `/meals/${m.id}`,
              title: m.name,
              meta: [humanizeEnum(m.mealType), m.plan],
            }))}
          />
        </TabsContent>

        <TabsContent value="addons">
          <CatalogueTab
            title="Add-on options"
            note="Active add-ons from the shared catalogue (global)."
            emptyHint="No active add-ons yet. Add some under Add-ons."
            items={addonOptions.map((a) => ({
              id: a.id,
              href: `/addons/${a.id}`,
              title: a.name,
              meta: [a.description],
            }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

interface CatalogueItem {
  id: string;
  href: string;
  title: string;
  meta: (string | null)[];
}

/**
 * Read-only list of master-data options available to the trip. It links to the
 * shared master records (never duplicating them). Curated per-trip selection
 * (ticking specific options) is intentionally not implemented — the schema has no
 * trip↔catalogue join tables, so it is reported as a required schema change.
 */
function CatalogueTab({
  title,
  note,
  emptyHint,
  items,
}: {
  title: string;
  note: string;
  emptyHint: string;
  items: CatalogueItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-xs">{note}</AlertDescription>
        </Alert>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={item.href} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {item.meta
                      .filter((m): m is string => Boolean(m))
                      .map((m, i) => (
                        <Badge key={i} variant="outline" className="font-normal">
                          {m}
                        </Badge>
                      ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Open ${item.title}`} asChild>
                  <Link href={item.href}>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
