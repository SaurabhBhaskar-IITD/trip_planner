import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { guardPage } from "@/server/auth/page-guard";
import { AccessDenied } from "@/components/common/access-denied";
import { PageHeader } from "@/components/common/page-header";
import { PhaseNotice } from "@/components/common/phase-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSIONS, ROLES, ROLE_LABELS, roleHasPermission } from "@/config/roles";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { allowed } = await guardPage("settings:read");
  if (!allowed) return <AccessDenied permission="settings:read" />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace configuration and the role-based access control matrix."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Role &amp; permission matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {ROLES.map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="font-mono text-xs">{permission}</TableCell>
                  {ROLES.map((role) => (
                    <TableCell key={role} className="text-center">
                      {roleHasPermission(role, permission) ? (
                        <Check className="mx-auto size-4 text-success" />
                      ) : (
                        <Minus className="mx-auto size-4 text-muted-foreground/40" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PhaseNotice
        phase="Phase 2"
        description="User management, editable roles and workspace preferences will be implemented in Phase 2. The matrix above is the current source-of-truth authorization policy."
      />
    </>
  );
}
