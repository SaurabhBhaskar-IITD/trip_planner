"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Role } from "@/config/roles";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";

/** Off-canvas navigation drawer for tablet/mobile widths. */
export function MobileSidebar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <Brand />
              <button
                className="rounded-md p-1 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav role={role} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
