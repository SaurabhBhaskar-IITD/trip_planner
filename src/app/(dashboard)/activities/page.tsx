import type { Metadata } from "next";
import Link from "next/link";
import { Ticket, Plus } from "lucide-react";
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
import { activityRepository, destinationRepository, parseListQuery } from "@/server/repositories";
import type { ActivityListItemDTO } from "@/types/master-data";
import { ACTIVITY_TYPES, humanizeEnum } from "@/domain/shared/enums";
import { ActivityDialog } from "./activity-dialog";
import { ActivityRowActions } from "./activity-row-actions";

export const metadata: Metadata = { title: "Activities" };

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("activity:read");
  if (!allowed) return <AccessDenied permission="activity:read" />;

  const canWrite = can(user, "activity:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp, { filterKeys: ["type"] });
  const [{ items, total, page, pageSize, pageCount }, destinationOptions] = await Promise.all([
    activityRepository.list(query),
    destinationRepository.listOptions(),
  ]);

  const columns: Column<ActivityListItemDTO>[] = [
    {
      header: "Activity",
      cell: (a) => (
        <Link href={`/activities/${a.id}`} className="min-w-0 font-medium hover:underline">
          {a.name}
        </Link>
      ),
    },
    { header: "Type", cell: (a) => <Badge variant="secondary">{humanizeEnum(a.type)}</Badge> },
    {
      header: "Destination",
      cell: (a) => a.destinationName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      header: "Duration",
      cell: (a) =>
        a.durationMinutes ? (
          `${a.durationMinutes} min`
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      header: "Prices",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (a) => a.priceCount,
    },
    { header: "Status", cell: (a) => <ActiveBadge active={a.active} /> },
    {
      header: "",
      headClassName: "w-24",
      cell: (a) => <ActivityRowActions activity={a} canWrite={canWrite} />,
    },
  ];

  const newButton = canWrite ? (
    <ActivityDialog
      destinationOptions={destinationOptions}
      trigger={
        <Button>
          <Plus />
          New activity
        </Button>
      }
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Activities"
        description="Sightseeing, adventure and experiences with per-person or group pricing."
        actions={newButton}
      />

      <SearchFilterBar
        searchPlaceholder="Search activity or destination…"
        filters={[
          {
            param: "type",
            allLabel: "All types",
            options: ACTIVITY_TYPES.map((t) => ({ value: t, label: humanizeEnum(t) })),
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
            icon={Ticket}
            title={
              query.q || query.status || query.filters.type
                ? "No matching activities"
                : "No activities yet"
            }
            description={
              query.q || query.status || query.filters.type
                ? "Try adjusting your search or filters."
                : "Create your first activity, then add pricing."
            }
            action={!query.q && !query.status && !query.filters.type ? newButton : undefined}
          />
        }
      />

      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        basePath="/activities"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
