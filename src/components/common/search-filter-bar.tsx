"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

interface FilterOption {
  value: string;
  label: string;
}

/** An additional URL-driven dropdown filter beyond the standard status one. */
export interface ExtraFilter {
  /** Query-string parameter this filter writes to (e.g. "category", "mode"). */
  param: string;
  /** Label for the "all" option, e.g. "All categories". */
  allLabel: string;
  options: FilterOption[];
  widthClassName?: string;
}

/**
 * URL-driven search + status filter. State lives in the query string (not local
 * component state) so it survives navigation, is shareable, and drives the
 * server component's data fetch. Debounced to avoid a request per keystroke.
 * `filters` renders extra dropdowns (category, mode, …) each bound to its own
 * query param — same URL-driven contract, no duplicated bar per module.
 */
export function SearchFilterBar({
  searchPlaceholder = "Search…",
  statusOptions,
  filters,
  className,
}: {
  searchPlaceholder?: string;
  statusOptions?: FilterOption[];
  filters?: ExtraFilter[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      next.delete("page"); // any filter change resets pagination
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  // Debounce the free-text search.
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get("q") ?? "";
      if (q !== current) {
        pushParams((p) => (q ? p.set("q", q) : p.delete("q")));
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [q, params, pushParams]);

  const status = params.get("status") ?? "all";

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label="Search"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {filters?.map((f) => {
        const current = params.get(f.param) ?? "all";
        return (
          <Select
            key={f.param}
            value={current}
            onValueChange={(v) =>
              pushParams((p) => (v === "all" ? p.delete(f.param) : p.set(f.param, v)))
            }
          >
            <SelectTrigger
              className={cn("w-full sm:w-44", f.widthClassName)}
              aria-label={f.allLabel}
            >
              <SelectValue placeholder={f.allLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{f.allLabel}</SelectItem>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {statusOptions ? (
        <Select
          value={status}
          onValueChange={(v) =>
            pushParams((p) => (v === "all" ? p.delete("status") : p.set("status", v)))
          }
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
