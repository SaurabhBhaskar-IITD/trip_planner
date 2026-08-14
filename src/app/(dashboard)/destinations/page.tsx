import type { Metadata } from "next";
import { MapPin, Plus } from "lucide-react";
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
import { destinationRepository, parseListQuery } from "@/server/repositories";
import type { DestinationDTO } from "@/types/master-data";
import { DestinationDialog } from "./destination-dialog";
import { DestinationRowActions } from "./destination-row-actions";

export const metadata: Metadata = { title: "Destinations" };

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("destination:read");
  if (!allowed) return <AccessDenied permission="destination:read" />;

  const canWrite = can(user, "destination:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp);
  const { items, total, page, pageSize, pageCount } = await destinationRepository.list(query);

  const columns: Column<DestinationDTO>[] = [
    {
      header: "Destination",
      cell: (d) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground">{d.name}</div>
          <div className="truncate text-xs text-muted-foreground">/{d.slug}</div>
        </div>
      ),
    },
    { header: "Region", cell: (d) => d.region ?? <Muted /> },
    { header: "Country", cell: (d) => d.country },
    {
      header: "Trips",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (d) => d.tripCount,
    },
    { header: "Status", cell: (d) => <ActiveBadge active={d.active} /> },
    {
      header: "",
      headClassName: "w-24",
      cell: (d) => <DestinationRowActions destination={d} canWrite={canWrite} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Destinations"
        description="Reusable places attached to trips. One record per destination — no duplicates."
        actions={
          canWrite ? (
            <DestinationDialog
              trigger={
                <Button>
                  <Plus />
                  New destination
                </Button>
              }
            />
          ) : undefined
        }
      />

      <SearchFilterBar
        searchPlaceholder="Search destinations…"
        statusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
        ]}
      />

      <MasterDataTable
        columns={columns}
        rows={items}
        getRowKey={(d) => d.id}
        empty={
          <EmptyState
            icon={MapPin}
            title={query.q || query.status ? "No matching destinations" : "No destinations yet"}
            description={
              query.q || query.status
                ? "Try adjusting your search or filter."
                : "Create your first destination to start building trips."
            }
            action={
              canWrite && !query.q && !query.status ? (
                <DestinationDialog
                  trigger={
                    <Button>
                      <Plus />
                      New destination
                    </Button>
                  }
                />
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
        basePath="/destinations"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}

function Muted() {
  return <span className="text-muted-foreground">—</span>;
}
