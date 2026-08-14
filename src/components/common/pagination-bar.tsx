import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Server-rendered pagination that preserves existing query params (search,
 * filters) while changing only `page`. Hidden when there is a single page.
 */
export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  searchParams,
  basePath,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
  basePath: string;
}) {
  if (pageCount <= 1) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        {total} {total === 1 ? "record" : "records"}
      </p>
    );
  }

  const hrefFor = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") sp.set(k, v);
    }
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-muted-foreground">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <PageLink disabled={page <= 1} href={hrefFor(page - 1)} label="Previous">
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="text-xs text-muted-foreground">
          Page {page} of {pageCount}
        </span>
        <PageLink disabled={page >= pageCount} href={hrefFor(page + 1)} label="Next">
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const classes = cn(buttonVariants({ variant: "outline", size: "icon" }), "size-8");
  if (disabled) {
    return (
      <span aria-disabled className={cn(classes, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={classes}>
      {children}
    </Link>
  );
}
