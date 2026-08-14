import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus, Plus } from "lucide-react";
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
import { addonRepository, parseListQuery } from "@/server/repositories";
import type { AddonListItemDTO } from "@/types/master-data";
import { AddonDialog } from "./addon-dialog";
import { AddonRowActions } from "./addon-row-actions";

export const metadata: Metadata = { title: "Add-ons" };

export default async function AddonsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("addon:read");
  if (!allowed) return <AccessDenied permission="addon:read" />;

  const canWrite = can(user, "addon:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp);
  const { items, total, page, pageSize, pageCount } = await addonRepository.list(query);

  const columns: Column<AddonListItemDTO>[] = [
    {
      header: "Add-on",
      cell: (a) => (
        <Link href={`/addons/${a.id}`} className="min-w-0 hover:underline">
          <div className="font-medium text-foreground">{a.name}</div>
          {a.description ? (
            <div className="max-w-md truncate text-xs text-muted-foreground">{a.description}</div>
          ) : null}
        </Link>
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
      cell: (a) => <AddonRowActions addon={a} canWrite={canWrite} />,
    },
  ];

  const newButton = canWrite ? (
    <AddonDialog
      trigger={
        <Button>
          <Plus />
          New add-on
        </Button>
      }
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Add-ons"
        description="Optional extras — transfers, upgrades, guides, insurance — with flexible pricing."
        actions={newButton}
      />

      <SearchFilterBar
        searchPlaceholder="Search add-ons…"
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
            icon={PackagePlus}
            title={query.q || query.status ? "No matching add-ons" : "No add-ons yet"}
            description={
              query.q || query.status
                ? "Try adjusting your search or filter."
                : "Create your first add-on, then add pricing."
            }
            action={!query.q && !query.status ? newButton : undefined}
          />
        }
      />

      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        basePath="/addons"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
