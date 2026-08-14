import type { Metadata } from "next";
import Link from "next/link";
import { Map, Plus } from "lucide-react";
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
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { tripRepository, parseListQuery } from "@/server/repositories";
import { formatDate } from "@/lib/utils/format";
import type { TripListItemDTO } from "@/types/master-data";
import { TripRowActions } from "./trip-row-actions";

export const metadata: Metadata = { title: "Trips" };

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("trip:read");
  if (!allowed) return <AccessDenied permission="trip:read" />;

  const canWrite = can(user, "trip:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp);
  const { items, total, page, pageSize, pageCount } = await tripRepository.list(query);

  const columns: Column<TripListItemDTO>[] = [
    {
      header: "Trip",
      cell: (t) => (
        <Link href={`/trips/${t.id}`} className="group block min-w-0">
          <div className="font-medium text-foreground group-hover:underline">{t.name}</div>
          <div className="truncate text-xs text-muted-foreground">/{t.slug}</div>
        </Link>
      ),
    },
    {
      header: "Destinations",
      cell: (t) =>
        t.destinationNames.length ? (
          <span className="text-sm text-muted-foreground">
            {t.destinationNames.slice(0, 3).join(" → ")}
            {t.destinationNames.length > 3 ? ` +${t.destinationNames.length - 3}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      header: "Duration",
      cell: (t) => (
        <span className="whitespace-nowrap text-sm tabular-nums">
          {t.durationDays}D / {t.durationNights}N
        </span>
      ),
    },
    { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    {
      header: "Version",
      headClassName: "text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (t) => `v${t.version}`,
    },
    {
      header: "Updated",
      className: "whitespace-nowrap text-sm text-muted-foreground",
      cell: (t) => formatDate(t.updatedAt),
    },
    {
      header: "",
      headClassName: "w-12",
      cell: (t) => (canWrite ? <TripRowActions trip={t} /> : null),
    },
  ];

  return (
    <>
      <PageHeader
        title="Trips"
        description="Reusable Trip Le tour products — the catalogue quotes are built from."
        actions={
          canWrite ? (
            <Button asChild>
              <Link href="/trips/new">
                <Plus />
                New trip
              </Link>
            </Button>
          ) : undefined
        }
      />

      <SearchFilterBar
        searchPlaceholder="Search trips…"
        statusOptions={[
          { value: "draft", label: "Draft" },
          { value: "active", label: "Active" },
          { value: "archived", label: "Archived" },
        ]}
      />

      <MasterDataTable
        columns={columns}
        rows={items}
        getRowKey={(t) => t.id}
        empty={
          <EmptyState
            icon={Map}
            title={query.q || query.status ? "No matching trips" : "No trips yet"}
            description={
              query.q || query.status
                ? "Try adjusting your search or filter."
                : "Create your first trip product to start building itineraries and quotes."
            }
            action={
              canWrite && !query.q && !query.status ? (
                <Button asChild>
                  <Link href="/trips/new">
                    <Plus />
                    New trip
                  </Link>
                </Button>
              ) : undefined
            }
          />
        }
      />

      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        basePath="/trips"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
