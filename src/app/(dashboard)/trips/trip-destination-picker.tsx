"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, MapPin, X } from "lucide-react";
import type { DestinationOption } from "@/types/master-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/**
 * Ordered destination selector. The order matters (Delhi → Shimla → Manali) and
 * is submitted as a comma-separated hidden field, so the exact arrangement is
 * persisted to the DB rather than inferred from UI order at read time.
 */
export function TripDestinationPicker({
  options,
  initialSelectedIds,
}: {
  options: DestinationOption[];
  initialSelectedIds: string[];
}) {
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const [selected, setSelected] = useState<string[]>(
    initialSelectedIds.filter((id) => byId.has(id)),
  );

  const available = options.filter((o) => !selected.includes(o.id));

  const move = (index: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name="destinationIds" value={selected.join(",")} />

      <Select value="" onValueChange={(id) => id && setSelected((p) => [...p, id])}>
        <SelectTrigger aria-label="Add destination">
          <SelectValue
            placeholder={available.length ? "Add a destination…" : "All destinations added"}
          />
        </SelectTrigger>
        <SelectContent>
          {available.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          No destinations added yet. Order matters — add them in travel sequence.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {selected.map((id, i) => {
            const opt = byId.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium tabular-nums">
                  {i + 1}
                </span>
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{opt?.name ?? "Unknown"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={i === selected.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setSelected((p) => p.filter((x) => x !== id))}
                  aria-label="Remove"
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
