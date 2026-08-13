import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Quote detail" };

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed } = await guardPage("quote:read");
  if (!allowed) return <AccessDenied permission="quote:read" />;

  const { id } = await params;

  return (
    <>
      <PageHeader
        title="Quote detail"
        description={`Reference: ${id}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/quotes">
              <ArrowLeft />
              Back to quotes
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Quote versions, selected components, the internal price breakdown and the generated
          itinerary will be shown here. Each version stores a frozen price snapshot so numbers never
          drift when master data changes.
        </CardContent>
      </Card>
      <PhaseNotice
        phase="Phase 3"
        description="The full quote detail — versioned snapshots, internal margin view and itinerary output — will be implemented in Phase 3/4."
      />
    </>
  );
}
