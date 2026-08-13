import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/rbac";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { env } from "@/config/env";

/**
 * Server-side gate for every dashboard route. Middleware already blocks
 * unauthenticated access, but we re-check here (defence in depth) and use the
 * resolved user to render the shell with the correct role-based navigation.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell
      user={{ name: user.name ?? "Team member", email: user.email ?? "", role: user.role }}
      databaseConfigured={env.isDatabaseConfigured}
    >
      {children}
    </DashboardShell>
  );
}
