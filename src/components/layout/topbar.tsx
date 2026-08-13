import { Search } from "lucide-react";
import type { Role } from "@/config/roles";
import { MobileSidebar } from "./mobile-sidebar";
import { UserMenu } from "./user-menu";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  user: { name: string; email: string; role: Role };
  databaseConfigured: boolean;
}

/** Sticky top navigation bar for the dashboard shell. */
export function Topbar({ user, databaseConfigured }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <MobileSidebar role={user.role} />

      <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
        <Search className="size-4" />
        <span>Search is coming in Phase 2</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {!databaseConfigured ? (
          <Badge variant="warning" className="hidden sm:inline-flex">
            Database not connected
          </Badge>
        ) : null}
        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
