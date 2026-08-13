import type { Metadata } from "next";
import { BedDouble, Plus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCOMMODATION_CATEGORIES, ROOM_TYPES } from "@/domain/shared/enums";

export const metadata: Metadata = { title: "Accommodations" };

const labelize = (s: string) => s.replace(/_/g, " ");

export default async function AccommodationsPage() {
  const { allowed } = await guardPage("accommodation:read");
  if (!allowed) return <AccessDenied permission="accommodation:read" />;

  return (
    <>
      <PageHeader
        title="Accommodations"
        description="Hotels and properties, with room types, categories and per-night pricing."
        actions={
          <Button disabled>
            <Plus />
            New property
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supported catalogue dimensions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Room types
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROOM_TYPES.map((r) => (
                <Badge key={r} variant="secondary" className="capitalize">
                  {labelize(r)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ACCOMMODATION_CATEGORIES.map((c) => (
                <Badge key={c} variant="secondary" className="capitalize">
                  {labelize(c)}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <EmptyState
        icon={BedDouble}
        title="No accommodations added yet"
        description="Properties and their room-level pricing will be managed here in Phase 2."
      />
      <PhaseNotice
        phase="Phase 2"
        description="Accommodation CRUD with seasonal, occupancy-aware pricing will be implemented in Phase 2."
      />
    </>
  );
}
