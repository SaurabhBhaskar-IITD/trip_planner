import type { Metadata } from "next";
import { Users, Plus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { can, getCurrentUser } from "@/server/auth/rbac";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const { allowed } = await guardPage("customer:read");
  if (!allowed) return <AccessDenied permission="customer:read" />;

  const user = await getCurrentUser();
  const canWrite = user ? can(user, "customer:write") : false;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customers and their travellers, associated with quotes."
        actions={
          canWrite ? (
            <Button disabled>
              <Plus />
              New customer
            </Button>
          ) : undefined
        }
      />
      <EmptyState
        icon={Users}
        title="No customers yet"
        description="Customer records and traveller details will be managed here in Phase 2."
      />
      <PhaseNotice
        phase="Phase 2"
        description="Customer CRUD and traveller management will be implemented in Phase 2."
      />
    </>
  );
}
