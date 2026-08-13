import type { Metadata } from "next";
import { FileText, FilePlus2 } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Button } from "@/components/ui/button";
import { can, getCurrentUser } from "@/server/auth/rbac";

export const metadata: Metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const { allowed } = await guardPage("quote:read");
  if (!allowed) return <AccessDenied permission="quote:read" />;

  const user = await getCurrentUser();
  const canCreate = user ? can(user, "quote:create") : false;

  return (
    <>
      <PageHeader
        title="Quotes"
        description="Customized proposals with versioned, price-snapshotted history."
        actions={
          canCreate ? (
            <Button disabled>
              <FilePlus2 />
              New quote
            </Button>
          ) : undefined
        }
      />
      <EmptyState
        icon={FileText}
        title="No quotes yet"
        description="The quote builder will let the team assemble a trip, price it deterministically, and save a versioned snapshot so historical quotes never change. Arriving in Phase 3."
      />
      <PhaseNotice
        phase="Phase 3"
        description="Quote creation, price snapshotting, version tracking and the internal price breakdown will be implemented in Phase 3."
      />
    </>
  );
}
