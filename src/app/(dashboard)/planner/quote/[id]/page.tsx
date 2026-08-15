import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreakdownTable } from "@/components/planner/breakdown-table";
import { ItineraryView } from "@/components/planner/itinerary-view";
import { quoteStoreRepository } from "@/server/repositories";
import { formatDate, formatMinorAsINR } from "@/lib/utils/format";
import type { PlannerItineraryDoc } from "@/domain/planner/types";

export const metadata: Metadata = { title: "Quote" };

const STATUS_MAP: Record<string, "active" | "inactive" | "draft" | "archived"> = {
  draft: "draft",
  sent: "active",
  awaiting_response: "draft",
  confirmed: "active",
  cancelled: "archived",
  expired: "inactive",
};

export default async function QuoteResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("quote:read");
  if (!allowed) return <AccessDenied permission="quote:read" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const canViewInternal = can(user, "pricing:viewInternal");
  const { id } = await params;
  const quote = await quoteStoreRepository.findDetail(id, { includeInternal: canViewInternal });
  if (!quote) notFound();

  const sp = await searchParams;
  const requested = Number.parseInt((Array.isArray(sp.v) ? sp.v[0] : sp.v) ?? "", 10);
  const version =
    quote.versions.find((v) => v.version === requested) ??
    quote.versions.find((v) => v.version === quote.currentVersion) ??
    quote.versions[quote.versions.length - 1];

  if (!version) notFound();
  const itinerary = version.itinerary as PlannerItineraryDoc;

  return (
    <>
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Trip plan for {quote.customer.name}
            </h1>
            <StatusBadge status={STATUS_MAP[quote.status] ?? "draft"} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{quote.reference}</span> · {quote.tripName} ·{" "}
            {version.travellerCount} travellers
            {quote.customer.phone ? ` · ${quote.customer.phone}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/quotes">
              <ArrowLeft />
              Quotes
            </Link>
          </Button>
          <Button asChild>
            <Link href="/planner">New quote</Link>
          </Button>
        </div>
      </div>

      {/* Version switcher (§30) */}
      {quote.versions.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Versions:</span>
          {quote.versions.map((v) => (
            <Button
              key={v.version}
              asChild
              size="sm"
              variant={v.version === version.version ? "default" : "outline"}
            >
              <Link href={`/planner/quote/${quote.id}?v=${v.version}`}>
                v{v.version}
                {v.version === quote.currentVersion ? " (current)" : ""}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Price breakdown</CardTitle>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-semibold tabular-nums">
                {formatMinorAsINR(version.grandTotalMinor)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BreakdownTable
              lines={version.items.map((it) => ({
                label: it.label,
                allocationNote: (it.meta?.allocationNote as string) ?? it.description ?? "",
                unit: it.unit,
                quantity: it.quantity,
                unitPriceMinor: it.unitPriceMinor,
                lineTotalMinor: it.lineTotalMinor,
                supplierCostMinor: it.supplierCostMinor,
                marginMinor: it.marginMinor,
                marginPercentage: it.marginPercentage,
              }))}
              subtotalMinor={version.subtotalMinor}
              discountTotalMinor={version.discountTotalMinor}
              taxTotalMinor={version.taxTotalMinor}
              taxConfigured={version.taxTotalMinor > 0}
              grandTotalMinor={version.grandTotalMinor}
              canViewInternal={canViewInternal}
              internal={version.internal}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Quote details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Reference" value={quote.reference} />
            <Row label="Version" value={`v${version.version} of ${quote.versions.length}`} />
            <Row label="Trip" value={quote.tripName} />
            <Row label="Travellers" value={String(version.travellerCount)} />
            <Row
              label="Travel dates"
              value={
                version.travelStartDate
                  ? `${formatDate(version.travelStartDate)}${version.travelEndDate ? ` → ${formatDate(version.travelEndDate)}` : ""}`
                  : "Date-independent"
              }
            />
            <Row label="Created" value={formatDate(version.createdAt)} />
            <Row label="Engine" value={version.pricingEngineVersion} />
            {version.note ? <Row label="Note" value={version.note} /> : null}
            <div className="pt-2">
              <Badge variant="outline" className="font-normal">
                Snapshot frozen — immune to later catalogue price changes
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Custom itinerary</CardTitle>
        </CardHeader>
        <CardContent>
          <ItineraryView doc={itinerary} />
        </CardContent>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
