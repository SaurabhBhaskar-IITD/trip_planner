import type { Metadata } from "next";
import Link from "next/link";
import { Bus, Plus, Users } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SearchFilterBar } from "@/components/common/search-filter-bar";
import { MasterDataTable, type Column } from "@/components/common/master-data-table";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ActiveBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { transportationRepository, parseListQuery } from "@/server/repositories";
import type { TransportationListItemDTO } from "@/types/master-data";
import { TRANSPORT_MODES, humanizeEnum } from "@/domain/shared/enums";
import { TransportationDialog } from "./transportation-dialog";
import { TransportationRowActions } from "./transportation-row-actions";

export const metadata: Metadata = { title: "Transport" };

export default async function TransportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("transport:read");
  if (!allowed) return <AccessDenied permission="transport:read" />;

  const canWrite = can(user, "transport:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp, { filterKeys: ["mode"] });
  const { items, total, page, pageSize, pageCount } = await transportationRepository.list(query);

  const columns: Column<TransportationListItemDTO>[] = [
    {
      header: "Transport",
      cell: (t) => (
        <Link href={`/transport/${t.id}`} className="min-w-0 hover:underline">
          <div className="font-medium text-foreground">{t.name}</div>
          {t.provider ? (
            <div className="text-xs text-muted-foreground">{t.provider}</div>
          ) : null}
        </Link>
      ),
    },
    { header: "Mode", cell: (t) => <Badge variant="secondary">{humanizeEnum(t.mode)}</Badge> },
    {
      header: "Route",
      cell: (t) =>
        t.routeFrom || t.routeTo ? (
          <span className="text-sm">
            {t.routeFrom ?? "—"} <span className="text-muted-foreground">→</span> {t.routeTo ?? "—"}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      header: "Capacity",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (t) => (
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5 text-muted-foreground" />
          {t.capacity}
        </span>
      ),
    },
    {
      header: "Prices",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (t) => t.priceCount,
    },
    { header: "Status", cell: (t) => <ActiveBadge active={t.active} /> },
    {
      header: "",
      headClassName: "w-24",
      cell: (t) => <TransportationRowActions transportation={t} canWrite={canWrite} />,
    },
  ];

  const newButton = canWrite ? (
    <TransportationDialog
      trigger={
        <Button>
          <Plus />
          New transport
        </Button>
      }
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Transport"
        description="Trains, flights, vehicles and transfers with structured capacity and route pricing."
        actions={newButton}
      />

      <SearchFilterBar
        searchPlaceholder="Search name, provider or route…"
        filters={[
          {
            param: "mode",
            allLabel: "All modes",
            options: TRANSPORT_MODES.map((m) => ({ value: m, label: humanizeEnum(m) })),
          },
        ]}
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

      <MasterDataTable
        columns={columns}
        rows={items}
        getRowKey={(t) => t.id}
        empty={
          <EmptyState
            icon={Bus}
            title={
              query.q || query.status || query.filters.mode
                ? "No matching transport"
                : "No transport yet"
            }
            description={
              query.q || query.status || query.filters.mode
                ? "Try adjusting your search or filters."
                : "Create your first transport option, then add route pricing."
            }
            action={!query.q && !query.status && !query.filters.mode ? newButton : undefined}
          />
        }
      />

      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        basePath="/transport"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
