"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import type { OptionCandidateDTO, TripOptionKind } from "@/server/repositories";
import { setTripOptionAction } from "@/server/actions/trip-option.actions";
import { Badge } from "@/components/ui/badge";

/**
 * Toggle which reusable master records are available for this trip (§ trip-option
 * requirement). Master data is never duplicated — toggling writes a join row. When
 * read-only (no trip:write) it just lists the enabled options.
 */
export function TripOptionsEditor({
  tripId,
  kind,
  candidates,
  canWrite,
  emptyHint,
}: {
  tripId: string;
  kind: TripOptionKind;
  candidates: OptionCandidateDTO[];
  canWrite: boolean;
  emptyHint: string;
}) {
  const [rows, setRows] = useState(candidates);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(row: OptionCandidateDTO) {
    if (!canWrite) return;
    const next = !row.enabled;
    setPendingId(row.id);
    setError(null);
    // optimistic
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, enabled: next } : r)));
    startTransition(async () => {
      const res = await setTripOptionAction(tripId, kind, row.id, next);
      if (!res.ok) {
        // Revert AND say why — a toggle that silently springs back is unexplainable.
        setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, enabled: !next } : r)));
        setError(res.message);
      }
      setPendingId(null);
    });
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  }

  if (!canWrite) {
    const enabled = rows.filter((r) => r.enabled);
    if (enabled.length === 0)
      return <p className="text-sm text-muted-foreground">No options enabled for this trip yet.</p>;
    return (
      <ul className="divide-y">
        {enabled.map((r) => (
          <li key={r.id} className="py-2">
            <span className="font-medium">{r.name}</span>
            {r.subtitle ? <span className="text-muted-foreground"> · {r.subtitle}</span> : null}
          </li>
        ))}
      </ul>
    );
  }

  const enabledCount = rows.filter((r) => r.enabled).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {enabledCount} of {rows.length} enabled — click to toggle what this trip offers.
      </p>
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {rows.map((r) => {
          const busy = pendingId === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r)}
              disabled={busy}
              aria-pressed={r.enabled}
              className={
                r.enabled
                  ? "flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-accent-ink"
                  : "flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs hover:bg-accent"
              }
              title={r.subtitle}
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : r.enabled ? (
                <Check className="size-3" />
              ) : (
                <Plus className="size-3" />
              )}
              <span>{r.name}</span>
              {!r.masterActive ? (
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                  inactive
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
