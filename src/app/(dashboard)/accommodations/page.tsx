import type { Metadata } from "next";
import Link from "next/link";
import { BedDouble, Plus } from "lucide-react";
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
import { accommodationRepository, destinationRepository, parseListQuery } from "@/server/repositories";
import type { AccommodationListItemDTO } from "@/types/master-data";
import { ACCOMMODATION_CATEGORIES, humanizeEnum } from "@/domain/shared/enums";
import { formatDate } from "@/lib/utils/format";
import { AccommodationDialog } from "./accommodation-dialog";
import { AccommodationRowActions } from "./accommodation-row-actions";

export const metadata: Metadata = { title: "Accommodations" };

export default async function AccommodationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("accommodation:read");
  if (!allowed) return <AccessDenied permission="accommodation:read" />;

  const canWrite = can(user, "accommodation:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp, { filterKeys: ["category"] });
  const [{ items, total, page, pageSize, pageCount }, destinationOptions] = await Promise.all([
    accommodationRepository.list(query),
    destinationRepository.listOptions(),
  ]);

  const columns: Column<AccommodationListItemDTO>[] = [
    {
      header: "Property",
      cell: (a) => (
        <Link href={`/accommodations/${a.id}`} className="min-w-0 hover:underline">
          <div className="font-medium text-foreground">{a.name}</div>
          {a.starRating ? (
            <div className="text-xs text-muted-foreground">{"★".repeat(a.starRating)}</div>
          ) : null}
        </Link>
      ),
    },
    { header: "Destination", cell: (a) => a.destinationName },
    {
      header: "Category",
      cell: (a) => <Badge variant="secondary">{humanizeEnum(a.category)}</Badge>,
    },
    {
      header: "Room types",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (a) => a.roomTypeCount,
    },
    { header: "Status", cell: (a) => <ActiveBadge active={a.active} /> },
    {
      header: "Last updated",
      className: "text-muted-foreground",
      cell: (a) => formatDate(a.updatedAt),
    },
    {
      header: "",
      headClassName: "w-24",
      cell: (a) => <AccommodationRowActions accommodation={a} canWrite={canWrite} />,
    },
  ];

  const newButton = canWrite ? (
    <AccommodationDialog
      destinationOptions={destinationOptions}
      trigger={
        <Button>
          <Plus />
          New property
        </Button>
      }
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Accommodations"
        description="Hotels and properties, each with room types and seasonal, occupancy-aware pricing."
        actions={newButton}
      />

      <SearchFilterBar
        searchPlaceholder="Search property or destination…"
        filters={[
          {
            param: "category",
            allLabel: "All categories",
            options: ACCOMMODATION_CATEGORIES.map((c) => ({ value: c, label: humanizeEnum(c) })),
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
        getRowKey={(a) => a.id}
        empty={
          <EmptyState
            icon={BedDouble}
            title={
              query.q || query.status || query.filters.category
                ? "No matching properties"
                : "No accommodations yet"
            }
            description={
              query.q || query.status || query.filters.category
                ? "Try adjusting your search or filters."
                : "Create your first property, then add room types and pricing."
            }
            action={!query.q && !query.status && !query.filters.category ? newButton : undefined}
          />
        }
      />

      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        basePath="/accommodations"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
