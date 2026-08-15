import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FilePlus2 } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { MasterDataTable, type Column } from "@/components/common/master-data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { quoteStoreRepository } from "@/server/repositories";
import type { QuoteListItemDTO } from "@/types/planner";
import { formatDate, formatMinorAsINR } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Quotes" };

const STATUS_MAP: Record<string, "active" | "inactive" | "draft" | "archived"> = {
  draft: "draft",
  sent: "active",
  awaiting_response: "draft",
  confirmed: "active",
  cancelled: "archived",
  expired: "inactive",
};

export default async function QuotesPage() {
  const { allowed, user } = await guardPage("quote:read");
  if (!allowed) return <AccessDenied permission="quote:read" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const canCreate = can(user, "quote:create");
  const quotes = await quoteStoreRepository.listRecent(50);

  const newButton = canCreate ? (
    <Button asChild>
      <Link href="/planner">
        <FilePlus2 />
        New quote
      </Link>
    </Button>
  ) : undefined;

  const columns: Column<QuoteListItemDTO>[] = [
    {
      header: "Reference",
      cell: (q) => (
        <Link href={`/planner/quote/${q.id}`} className="font-mono text-sm hover:underline">
          {q.reference}
        </Link>
      ),
    },
    { header: "Customer", cell: (q) => <span className="font-medium">{q.customerName}</span> },
    { header: "Trip", cell: (q) => q.tripName },
    {
      header: "Version",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (q) => `v${q.currentVersion}`,
    },
    {
      header: "Total",
      headClassName: "text-right",
      className: "text-right tabular-nums font-medium",
      cell: (q) => formatMinorAsINR(q.grandTotalMinor),
    },
    { header: "Status", cell: (q) => <StatusBadge status={STATUS_MAP[q.status] ?? "draft"} /> },
    { header: "Updated", className: "text-muted-foreground", cell: (q) => formatDate(q.updatedAt) },
  ];

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Customised proposals with versioned, price-snapshotted history."
        actions={newButton}
      />
      <MasterDataTable
        columns={columns}
        rows={quotes}
        getRowKey={(q) => q.id}
        empty={
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Use the planner to build a trip, price it deterministically, and save a versioned snapshot."
            action={newButton}
          />
        }
      />
    </>
  );
}
