import type { Metadata } from "next";
import {
  Map,
  Activity as ActivityIcon,
  FileText,
  Clock,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  FilePlus2,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard shell. Every metric is marked `unavailable` until the data layer is
 * wired in Phase 2/3 — we intentionally do NOT invent numbers (spec §11 & §17).
 */
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Operational overview for the Trip Le planning team."
        actions={
          <Button disabled>
            <FilePlus2 />
            New quote
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total trips" icon={Map} unavailable />
        <StatCard label="Active trips" icon={ActivityIcon} unavailable />
        <StatCard label="Quotes created" icon={FileText} unavailable />
        <StatCard label="Awaiting response" icon={Clock} unavailable />
        <StatCard label="Confirmed bookings" icon={CheckCircle2} unavailable />
        <StatCard
          label="Revenue"
          icon={IndianRupee}
          unavailable
          unavailableReason="Computed from confirmed quotes (Phase 3)"
        />
        <StatCard
          label="Estimated margin"
          icon={TrendingUp}
          unavailable
          unavailableReason="Internal metric — requires pricing engine (Phase 3)"
        />
        <StatCard label="Draft quotes" icon={FileText} unavailable />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No quotes yet"
              description="Once the quote builder ships in Phase 3, the team's latest quotes will appear here with status and value."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EmptyState
              icon={ActivityIcon}
              title="Nothing to show"
              description="Audit trail of team actions will surface here."
            />
          </CardContent>
        </Card>
      </div>

      <PhaseNotice
        phase="Phase 2"
        description="Dashboard metrics are placeholders by design. They will populate automatically once trips, quotes and the pricing engine are connected to the database."
      />
    </>
  );
}
