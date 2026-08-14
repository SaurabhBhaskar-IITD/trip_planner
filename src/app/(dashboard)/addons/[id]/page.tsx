import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { ActiveBadge } from "@/components/common/status-badge";
import { PricingTable } from "@/components/common/pricing-table";
import { PricingDialog } from "@/components/common/pricing-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addonRepository } from "@/server/repositories";
import { formatDate } from "@/lib/utils/format";
import { AddonDialog } from "../addon-dialog";

export const metadata: Metadata = { title: "Add-on detail" };

export default async function AddonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { allowed, user } = await guardPage("addon:read");
  if (!allowed) return <AccessDenied permission="addon:read" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const canWrite = can(user, "addon:write");
  const canWritePricing = can(user, "pricing:write");
  const canViewInternal = can(user, "pricing:viewInternal");

  const { id } = await params;
  const detail = await addonRepository.findDetail(id, { includeInternal: canViewInternal });
  if (!detail) notFound();
  const detailPath = `/addons/${detail.id}`;

  return (
    <>
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{detail.name}</h1>
            <ActiveBadge active={detail.active} />
          </div>
          {detail.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{detail.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/addons">
              <ArrowLeft />
              Add-ons
            </Link>
          </Button>
          {canWrite ? (
            <AddonDialog
              addon={detail}
              trigger={
                <Button>
                  <Pencil />
                  Edit
                </Button>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Status" value={<ActiveBadge active={detail.active} />} />
            <Row label="Price rows" value={String(detail.prices.length)} />
            <Row label="Updated" value={formatDate(detail.updatedAt)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Pricing ({detail.prices.length})</CardTitle>
            {canWritePricing ? (
              <PricingDialog
                kind="addon"
                parentId={detail.id}
                detailPath={detailPath}
                canViewInternal={canViewInternal}
                trigger={
                  <Button size="sm" variant="outline">
                    <Plus />
                    Add price
                  </Button>
                }
              />
            ) : null}
          </CardHeader>
          <CardContent>
            <PricingTable
              kind="addon"
              parentId={detail.id}
              detailPath={detailPath}
              prices={detail.prices}
              canWrite={canWritePricing}
              canViewInternal={canViewInternal}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
