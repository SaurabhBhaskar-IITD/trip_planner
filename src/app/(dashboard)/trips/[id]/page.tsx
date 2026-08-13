import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Trip detail" };

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await guardPage("trip:read");
  if (!allowed) return <AccessDenied permission="trip:read" />;

  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Trip detail"
        description={`Reference: ${id}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/trips">
              <ArrowLeft />
              Back to trips
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Trip overview (name, destinations, inclusions/exclusions) will be shown here once the
              data layer is connected.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="itinerary">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              The structured day-by-day itinerary — the input to the itinerary engine — will be
              editable here.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pricing">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Base pricing components attached to this trip will be listed here.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PhaseNotice
        phase="Phase 2"
        description="This detail view is a structural placeholder. Real trip data, itinerary editing and pricing will be wired to the database in Phase 2."
      />
    </>
  );
}
