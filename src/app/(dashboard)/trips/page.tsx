import type { Metadata } from "next";
import { Map, Plus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage() {
  const { allowed } = await guardPage("trip:read");
  if (!allowed) return <AccessDenied permission="trip:read" />;

  return (
    <>
      <PageHeader
        title="Trips"
        description="Reusable Trip Le tour products — the catalogue that quotes are built from."
        actions={
          <Button disabled>
            <Plus />
            New trip
          </Button>
        }
      />
      <EmptyState
        icon={Map}
        title="No trips in the catalogue yet"
        description="Trip products, destinations and their day-by-day structured itineraries are managed here. Creation and editing arrive in Phase 2."
      />
      <PhaseNotice
        phase="Phase 2"
        description="Trip CRUD, destination linking and structured itinerary editing will be implemented against the database in Phase 2."
      />
    </>
  );
}
