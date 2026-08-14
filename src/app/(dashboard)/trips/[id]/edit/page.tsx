import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { destinationRepository, tripRepository } from "@/server/repositories";
import { TripForm } from "../../trip-form";

export const metadata: Metadata = { title: "Edit trip" };

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await guardPage("trip:write");
  if (!allowed) return <AccessDenied permission="trip:write" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const { id } = await params;
  const [trip, destinationOptions] = await Promise.all([
    tripRepository.findDetail(id),
    destinationRepository.listOptions(),
  ]);
  if (!trip) notFound();

  return (
    <>
      <PageHeader
        title={`Edit — ${trip.name}`}
        description="Editing the trip product increments its version."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/trips/${id}`}>
              <ArrowLeft />
              Back to trip
            </Link>
          </Button>
        }
      />
      <TripForm trip={trip} destinationOptions={destinationOptions} />
    </>
  );
}
