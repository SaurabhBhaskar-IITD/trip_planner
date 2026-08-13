import type { Metadata } from "next";
import { Ticket, Plus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACTIVITY_TYPES, MEAL_PLANS } from "@/domain/shared/enums";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage() {
  const { allowed } = await guardPage("activity:read");
  if (!allowed) return <AccessDenied permission="activity:read" />;

  return (
    <>
      <PageHeader
        title="Activities & experiences"
        description="Sightseeing, adventure, tickets, guides and excursions — plus meal plans."
        actions={
          <Button disabled>
            <Plus />
            New activity
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
              Activity types
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_TYPES.map((t) => (
                <Badge key={t} variant="secondary" className="capitalize">
                  {t.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Meal plans
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MEAL_PLANS.map((p) => (
                <Badge key={p} variant="secondary">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <EmptyState
        icon={Ticket}
        title="No activities yet"
        description="Activities, guides and meal options with per-person pricing will be managed here in Phase 2."
      />
      <PhaseNotice
        phase="Phase 2"
        description="Activity and meal CRUD will be implemented in Phase 2."
      />
    </>
  );
}
