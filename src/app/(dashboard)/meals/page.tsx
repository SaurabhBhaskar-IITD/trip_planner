import type { Metadata } from "next";
import Link from "next/link";
import { UtensilsCrossed, Plus } from "lucide-react";
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
import { mealRepository, parseListQuery } from "@/server/repositories";
import type { MealListItemDTO } from "@/types/master-data";
import { MEAL_PLANS, humanizeEnum } from "@/domain/shared/enums";
import { MealDialog } from "./meal-dialog";
import { MealRowActions } from "./meal-row-actions";

export const metadata: Metadata = { title: "Meals" };

export default async function MealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { allowed, user } = await guardPage("meal:read");
  if (!allowed) return <AccessDenied permission="meal:read" />;

  const canWrite = can(user, "meal:write");
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const sp = await searchParams;
  const query = parseListQuery(sp, { filterKeys: ["plan"] });
  const { items, total, page, pageSize, pageCount } = await mealRepository.list(query);

  const columns: Column<MealListItemDTO>[] = [
    {
      header: "Meal",
      cell: (m) => (
        <Link href={`/meals/${m.id}`} className="min-w-0 font-medium hover:underline">
          {m.name}
        </Link>
      ),
    },
    { header: "Type", cell: (m) => <Badge variant="secondary">{humanizeEnum(m.mealType)}</Badge> },
    { header: "Plan", cell: (m) => <Badge variant="outline">{m.plan}</Badge> },
    {
      header: "Prices",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (m) => m.priceCount,
    },
    { header: "Status", cell: (m) => <ActiveBadge active={m.active} /> },
    {
      header: "",
      headClassName: "w-24",
      cell: (m) => <MealRowActions meal={m} canWrite={canWrite} />,
    },
  ];

  const newButton = canWrite ? (
    <MealDialog
      trigger={
        <Button>
          <Plus />
          New meal
        </Button>
      }
    />
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Meals"
        description="Meal plans (EP / CP / MAP / AP) with per-person pricing."
        actions={newButton}
      />

      <SearchFilterBar
        searchPlaceholder="Search meals…"
        filters={[
          {
            param: "plan",
            allLabel: "All plans",
            options: MEAL_PLANS.map((p) => ({ value: p, label: p === "custom" ? "Custom" : p })),
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
        getRowKey={(m) => m.id}
        empty={
          <EmptyState
            icon={UtensilsCrossed}
            title={
              query.q || query.status || query.filters.plan ? "No matching meals" : "No meals yet"
            }
            description={
              query.q || query.status || query.filters.plan
                ? "Try adjusting your search or filters."
                : "Create your first meal plan, then add pricing."
            }
            action={!query.q && !query.status && !query.filters.plan ? newButton : undefined}
          />
        }
      />

      <PaginationBar
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        basePath="/meals"
        searchParams={Object.fromEntries(
          Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
        )}
      />
    </>
  );
}
