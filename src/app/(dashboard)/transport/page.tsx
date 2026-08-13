import type { Metadata } from "next";
import { Bus, Plus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRANSPORT_MODES } from "@/domain/shared/enums";

export const metadata: Metadata = { title: "Transport" };

export default async function TransportPage() {
  const { allowed } = await guardPage("transport:read");
  if (!allowed) return <AccessDenied permission="transport:read" />;

  return (
    <>
      <PageHeader
        title="Transport"
        description="Transport options with capacity and pricing — used for transfers and inter-city movement."
        actions={
          <Button disabled>
            <Plus />
            New transport option
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supported transport modes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {TRANSPORT_MODES.map((m) => (
            <Badge key={m} variant="secondary" className="capitalize">
              {m.replace(/_/g, " ")}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <EmptyState
        icon={Bus}
        title="No transport options yet"
        description="Vehicle inventory, capacity and pricing (per vehicle, per person, per day) will be managed here in Phase 2."
      />
      <PhaseNotice
        phase="Phase 2"
        description="Transport CRUD with deterministic vehicle-capacity math will be implemented in Phase 2."
      />
    </>
  );
}
