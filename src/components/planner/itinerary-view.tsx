import { BedDouble, Bus, MapPin, UtensilsCrossed } from "lucide-react";
import type { PlannerItineraryDoc } from "@/domain/planner/types";
import { Badge } from "@/components/ui/badge";

/** Renders a frozen/generated itinerary document. Presentational + server-safe. */
export function ItineraryView({ doc }: { doc: PlannerItineraryDoc }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Prepared for
        </div>
        <div className="text-lg font-semibold">{doc.preparedFor}</div>
        <div className="mt-1 text-sm text-muted-foreground">
          {doc.tripName} · {doc.durationNights}N / {doc.durationDays}D · {doc.travellerCount}{" "}
          {doc.travellerCount === 1 ? "traveller" : "travellers"}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {doc.accommodationSummary ? (
            <Badge variant="secondary" className="gap-1">
              <BedDouble className="size-3" />
              {doc.accommodationSummary}
            </Badge>
          ) : null}
          {doc.transportSummary ? (
            <Badge variant="secondary" className="gap-1">
              <Bus className="size-3" />
              {doc.transportSummary}
            </Badge>
          ) : null}
        </div>
      </div>

      <ol className="space-y-3">
        {doc.days.map((day) => (
          <li key={day.dayNumber} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-medium">
                Day {day.dayNumber}: {day.title}
              </div>
              {day.route ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {day.route}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{day.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {day.transport ? (
                <Badge variant="outline" className="gap-1 font-normal">
                  <Bus className="size-3" />
                  {day.transport}
                </Badge>
              ) : null}
              {day.accommodation ? (
                <Badge variant="outline" className="gap-1 font-normal">
                  <BedDouble className="size-3" />
                  {day.accommodation}
                </Badge>
              ) : null}
              {day.meals ? (
                <Badge variant="outline" className="gap-1 font-normal">
                  <UtensilsCrossed className="size-3" />
                  {day.meals}
                </Badge>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-success">Inclusions</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {doc.inclusions.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-1.5 text-sm font-semibold text-destructive">Exclusions</h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {doc.exclusions.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      </div>

      {doc.notes.length ? (
        <div className="text-xs text-muted-foreground">
          {doc.notes.map((n, idx) => (
            <p key={idx}>• {n}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
