import type { Metadata } from "next";
import { ShieldCheck, Lock } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PRICING_UNITS } from "@/domain/shared/enums";
import { PRICING_ENGINE_VERSION } from "@/domain/pricing/engine";
import { can, getCurrentUser } from "@/server/auth/rbac";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage() {
  const { allowed } = await guardPage("pricing:read");
  if (!allowed) return <AccessDenied permission="pricing:read" />;

  const user = await getCurrentUser();
  const canViewInternal = user ? can(user, "pricing:viewInternal") : false;

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Pricing rules and the deterministic pricing engine that computes every quote."
      />

      <Alert variant="info">
        <ShieldCheck />
        <AlertTitle>Deterministic pricing engine · v{PRICING_ENGINE_VERSION}</AlertTitle>
        <AlertDescription>
          Prices, taxes, supplier costs, margins and discounts are computed by a pure, deterministic
          engine — never by AI. The engine core and unit tests are in place; the declarative rule
          evaluator lands in Phase 3.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Supported pricing units</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {PRICING_UNITS.map((u) => (
              <Badge key={u} variant="secondary">
                {u.replace(/_/g, " ")}
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lock className="size-4" />
              Internal commercial view
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {canViewInternal ? (
              <p>
                Your role can view supplier cost and margin. These figures are gated by the{" "}
                <code>pricing:viewInternal</code> permission and are stripped from any
                customer-facing output.
              </p>
            ) : (
              <p>
                Supplier cost and margin are hidden for your role. They require the{" "}
                <code>pricing:viewInternal</code> permission.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <PhaseNotice
        phase="Phase 3"
        description="Rule management (e.g. group discounts, category surcharges, transport swaps) and the live quote calculator will be implemented in Phase 3."
      />
    </>
  );
}
