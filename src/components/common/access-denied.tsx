import { ShieldAlert } from "lucide-react";
import { EmptyState } from "./empty-state";

/** Rendered when a signed-in user lacks the permission for a page. */
export function AccessDenied({ permission }: { permission?: string }) {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this area"
      description={
        permission
          ? `This section requires the "${permission}" permission. Ask an administrator if you need access.`
          : "Ask an administrator if you believe you should have access."
      }
    />
  );
}
