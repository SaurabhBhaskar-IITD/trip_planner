import { DatabaseZap } from "lucide-react";
import { EmptyState } from "./empty-state";

/**
 * Honest state shown on data-backed pages when no database is configured. We do
 * NOT fabricate data or pretend the list is empty — we say plainly that the DB
 * isn't connected and how to fix it.
 */
export function DatabaseUnavailable() {
  return (
    <EmptyState
      icon={DatabaseZap}
      title="Database not connected"
      description="Set DATABASE_URL (Neon PostgreSQL) in your environment and run the schema push to enable this section. See the README for setup."
    />
  );
}
