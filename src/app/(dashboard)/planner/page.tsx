import type { Metadata } from "next";
import { guardPage } from "@/server/auth/page-guard";
import { can } from "@/server/auth/rbac";
import { AccessDenied } from "@/components/common/access-denied";
import { DatabaseUnavailable } from "@/components/common/database-unavailable";
import { env } from "@/config/env";
import { listTripOptions } from "@/server/planner/planner.service";
import { PlannerWorkspace } from "./planner-workspace";

export const metadata: Metadata = { title: "Planner" };

export default async function PlannerPage() {
  const { allowed, user } = await guardPage("quote:create");
  if (!allowed) return <AccessDenied permission="quote:create" />;
  if (!env.isDatabaseConfigured) return <DatabaseUnavailable />;

  const trips = await listTripOptions();
  return <PlannerWorkspace trips={trips} canViewInternal={can(user, "pricing:viewInternal")} />;
}
