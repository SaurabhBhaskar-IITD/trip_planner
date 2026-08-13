import type { ReactNode } from "react";
import type { Role } from "@/config/roles";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  user: { name: string; email: string; role: Role };
  databaseConfigured: boolean;
  children: ReactNode;
}

/**
 * The persistent application frame: fixed desktop sidebar + sticky topbar +
 * scrollable content area. Desktop-first (spec §9) with a mobile drawer fallback.
 */
export function DashboardShell({ user, databaseConfigured, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <SidebarNav role={user.role} />
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-[11px] text-sidebar-foreground/40">
            Trip Le Tourism Pvt. Ltd. · Internal
          </p>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} databaseConfigured={databaseConfigured} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
