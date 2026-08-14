import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListOrdered, MapPin, Pencil } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { PhaseNotice } from "@/components/common/phase-notice";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tripRepository } from "@/server/repositories";
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

        {(["accommodation", "transport", "activities", "meals", "addons"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <PhaseNotice
              phase="Phase 2A (continued)"
              title="Coming in the next increment"
              description="Attaching accommodation, transport, activities, meals and add-ons to a trip lands as those master-data modules are completed. They will reference existing master records (no duplication)."
            />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
