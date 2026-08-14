import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { destinationRepository } from "@/server/repositories";
import { TripForm } from "../trip-form";

export const metadata: Metadata = { title: "New trip" };

export default async function NewTripPage() {
  const { allowed } = await guardPage("trip:write");
  if (!allowed) return <AccessDenied permission="trip:write" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const destinationOptions = await destinationRepository.listOptions();

  return (
    <>
      <PageHeader
        title="New trip"
        description="Create a reusable trip product. You can build its itinerary after saving."
        actions={
          <Button variant="outline" asChild>
            <Link href="/trips">
              <ArrowLeft />
              Back to trips
            </Link>
          </Button>
        }
      />
      <TripForm destinationOptions={destinationOptions} />
    </>
  );
}
