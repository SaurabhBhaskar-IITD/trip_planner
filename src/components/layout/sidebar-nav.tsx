"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/config/roles";
import { roleHasPermission } from "@/config/roles";
import { NAV_ITEMS, NAV_GROUP_ORDER, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Primary sidebar navigation. Items are filtered by the user's permissions for a
 * clean UI — but this is cosmetic only; each route is independently protected on
 * the server.
 */
export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  const visible = NAV_ITEMS.filter(
    (item) => !item.permission || roleHasPermission(role, item.permission),
  );

  const grouped = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: visible.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {grouped.map(({ group, items }) => (
        <div key={group} className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
            {group}
          </p>
          {items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", isActive ? "" : "text-sidebar-foreground/50")} />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
