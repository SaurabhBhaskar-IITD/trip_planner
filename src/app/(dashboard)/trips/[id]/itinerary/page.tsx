import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { destinationRepository, tripRepository } from "@/server/repositories";
import { ItineraryEditor } from "./itinerary-editor";

export const metadata: Metadata = { title: "Itinerary" };

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed, user } = await guardPage("trip:read");
  if (!allowed) return <AccessDenied permission="trip:read" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const { id } = await params;
  const [trip, destinationOptions] = await Promise.all([
    tripRepository.findDetail(id),
    destinationRepository.listOptions(),
  ]);
  if (!trip) notFound();

  const canWrite = can(user, "trip:write");

  return (
    <>
      <PageHeader
        title={`Itinerary — ${trip.name}`}
        description="Build the day-by-day structure. Days and segments are explicitly ordered in the database."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/trips/${trip.id}`}>
              <ArrowLeft />
              Back to trip
            </Link>
          </Button>
        }
      />
      <ItineraryEditor
        tripId={trip.id}
        days={trip.itinerary}
        destinationOptions={destinationOptions}
        canWrite={canWrite}
      />
    </>
  );
}
