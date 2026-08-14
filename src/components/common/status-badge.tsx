import { Badge } from "@/components/ui/badge";

/**
 * Consistent status pill across all master-data tables. Handles both the boolean
 * active/inactive model and the Trip draft/active/archived enum.
 */
type Status = "active" | "inactive" | "draft" | "archived";

const MAP: Record<
  Status,
  { label: string; variant: "success" | "secondary" | "warning" | "outline" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "secondary" },
  draft: { label: "Draft", variant: "warning" },
  archived: { label: "Archived", variant: "outline" },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = MAP[status] ?? MAP.inactive;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

/** Convenience for boolean-active entities. */
export function ActiveBadge({ active }: { active: boolean }) {
  return <StatusBadge status={active ? "active" : "inactive"} />;
}
