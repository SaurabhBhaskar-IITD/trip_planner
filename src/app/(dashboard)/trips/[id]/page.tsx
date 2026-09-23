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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  itineraryDocumentRepository,
  tripCustomizationRepository,
  tripOptionRepository,
  tripRepository,
} from "@/server/repositories";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { evaluateCustomization } from "@/domain/public-catalog/customization";
import { isStorageConfigured } from "@/server/storage/itinerary-blob";
import { TripOptionsEditor } from "./trip-options-editor";
import { PublicationStatusCard } from "./publishing/publication-status-card";
import { ItineraryDocumentCard } from "./publishing/itinerary-document-card";
import { CustomizationsPanel } from "./publishing/customizations-panel";
import type { CustomizationView } from "./publishing/types";

export const metadata: Metadata = { title: "Trip detail" };

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed, user } = await guardPage("trip:read");
  if (!allowed) return <AccessDenied permission="trip:read" />;

  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const { id } = await params;
  const trip = await tripRepository.findDetail(id);
  if (!trip) notFound();

  const canWrite = can(user, "trip:write");
  const canPrice = can(user, "pricing:write");
  const daysCount = trip.itinerary.length;
  const segmentCount = trip.itinerary.reduce((n, d) => n + d.segments.length, 0);

  // Trip-specific options: which reusable master records THIS trip offers. Backed
  // by the trip↔catalogue join tables. The planner shows exactly these.
  const [
    accCandidates,
    transportCandidates,
    activityCandidates,
    mealCandidates,
    addonCandidates,
    customizationRows,
    documents,
  ] = await Promise.all([
    tripOptionRepository.listCandidates(id, "accommodation"),
    tripOptionRepository.listCandidates(id, "transportation"),
    tripOptionRepository.listCandidates(id, "activity"),
    tripOptionRepository.listCandidates(id, "meal"),
    tripOptionRepository.listCandidates(id, "addon"),
    tripCustomizationRepository.listForTrip(id),
    itineraryDocumentRepository.listForTrip(id),
  ]);

  // Evaluate sellability on the server with the SAME rule the public API uses,
  // so the admin sees exactly what customers will (and won't) be offered.
  const customizations: CustomizationView[] = customizationRows.map((r) => {
    const verdict = evaluateCustomization({
      active: true, // judge the option on its own merits; `active` is shown separately
      masterActive: r.masterActive,
      priceOverrideMinor: r.priceOverrideMinor,
      priceOverrideUnit: r.priceOverrideUnit,
      masterPrices: r.masterPrices,
    });
    return {
      addonId: r.addonId,
      name: r.name,
      description: r.descriptionOverride ?? r.masterDescription,
      descriptionOverride: r.descriptionOverride,
      active: r.active,
      masterActive: r.masterActive,
      sortOrder: r.sortOrder,
      isDefault: r.isDefault,
      exclusiveGroup: r.exclusiveGroup,
      priceOverrideMinor: r.priceOverrideMinor,
      priceOverrideUnit: r.priceOverrideUnit,
      sellable: verdict.sellable,
      reason: verdict.sellable ? null : verdict.reason,
      priceMinor: verdict.sellable ? verdict.priceMinor : null,
      chargeBasis: verdict.sellable ? verdict.chargeBasis : null,
      priceSource: verdict.sellable ? verdict.source : null,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
  const attached = new Set(customizationRows.map((r) => r.addonId));
  const availableAddons = addonCandidates
    .filter((c) => !attached.has(c.id) && c.masterActive)
    .map((c) => ({ id: c.id, name: c.name }));
  const documentViews = documents.map((d) => ({
    id: d.id,
    version: d.version,
    fileName: d.fileName,
    sizeBytes: d.sizeBytes,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

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
            {formatDuration(trip.durationDays, trip.durationNights, "long")} · v{trip.version} ·{" "}
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

      <Tabs defaultValue="publishing">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="publishing">Publishing</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="destinations">Destinations</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
            <TabsTrigger value="transport">Transport</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="meals">Meals</TabsTrigger>
          </TabsList>
        </div>

        {/* What trip-le.com shows: publication, the paid itinerary PDF, and the
            customizations (this trip's add-ons) customers can buy. */}
        <TabsContent value="publishing">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6">
              <PublicationStatusCard
                tripId={trip.id}
                status={trip.status}
                publicOptionsEnabled={trip.publicOptionsEnabled}
                canWrite={canWrite}
              />
              <ItineraryDocumentCard
                tripId={trip.id}
                documents={documentViews}
                canWrite={canWrite}
                storageConfigured={isStorageConfigured()}
              />
            </div>
            <div className="lg:col-span-2">
              <CustomizationsPanel
                tripId={trip.id}
                rows={customizations}
                available={availableAddons}
                canWrite={canWrite}
                canPrice={canPrice}
              />
            </div>
          </div>
        </TabsContent>

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
                <Row
                  label="Duration"
                  value={formatDuration(trip.durationDays, trip.durationNights)}
                />
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
          <OptionTab
            title="Accommodation options"
            manageHref="/accommodations"
            manageLabel="Manage accommodations"
            canWrite={canWrite}
          >
            <TripOptionsEditor
              tripId={trip.id}
              kind="accommodation"
              candidates={accCandidates}
              canWrite={canWrite}
              emptyHint="No accommodations exist yet. Create some under Accommodations, then enable them here."
            />
          </OptionTab>
        </TabsContent>

        <TabsContent value="transport">
          <OptionTab
            title="Transport options"
            manageHref="/transport"
            manageLabel="Manage transport"
            canWrite={canWrite}
          >
            <TripOptionsEditor
              tripId={trip.id}
              kind="transportation"
              candidates={transportCandidates}
              canWrite={canWrite}
              emptyHint="No transport exists yet. Create some under Transport, then enable them here."
            />
          </OptionTab>
        </TabsContent>

        <TabsContent value="activities">
          <OptionTab
            title="Activity options"
            manageHref="/activities"
            manageLabel="Manage activities"
            canWrite={canWrite}
          >
            <TripOptionsEditor
              tripId={trip.id}
              kind="activity"
              candidates={activityCandidates}
              canWrite={canWrite}
              emptyHint="No activities exist yet. Create some under Activities, then enable them here."
            />
          </OptionTab>
        </TabsContent>

        <TabsContent value="meals">
          <OptionTab
            title="Meal options"
            manageHref="/meals"
            manageLabel="Manage meals"
            canWrite={canWrite}
          >
            <TripOptionsEditor
              tripId={trip.id}
              kind="meal"
              candidates={mealCandidates}
              canWrite={canWrite}
              emptyHint="No meals exist yet. Create some under Meals, then enable them here."
            />
          </OptionTab>
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

/** Card wrapper for one trip-option tab: title + a link to manage that catalogue. */
function OptionTab({
  title,
  manageHref,
  manageLabel,
  canWrite,
  children,
}: {
  title: string;
  manageHref: string;
  manageLabel: string;
  canWrite: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{title}</CardTitle>
        {canWrite ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={manageHref}>
              {manageLabel}
              <ArrowRight />
            </Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
