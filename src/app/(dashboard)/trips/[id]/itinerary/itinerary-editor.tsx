"use client";

import { useTransition } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { DestinationOption, ItineraryDayDTO, ItinerarySegmentDTO } from "@/types/master-data";
import { humanizeEnum } from "@/domain/shared/enums";
import {
  deleteDayAction,
  deleteSegmentAction,
  moveDayAction,
  moveSegmentAction,
} from "@/server/actions/itinerary.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { DayDialog } from "./day-dialog";
import { SegmentDialog } from "./segment-dialog";
import { ListOrdered } from "lucide-react";

const SEGMENT_VARIANT: Record<string, "default" | "secondary" | "success" | "warning"> = {
  transfer: "warning",
  accommodation: "default",
  meal: "success",
  activity: "default",
  sightseeing: "secondary",
  free_time: "secondary",
  note: "secondary",
};

function MoveButtons({
  onUp,
  onDown,
  disableUp,
  disableDown,
  pending,
}: {
  onUp: () => void;
  onDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={onUp}
        disabled={disableUp || pending}
        aria-label="Move up"
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={onDown}
        disabled={disableDown || pending}
        aria-label="Move down"
      >
        <ChevronDown className="size-4" />
      </Button>
    </div>
  );
}

function SegmentRow({
  tripId,
  dayId,
  segment,
  index,
  count,
  canWrite,
}: {
  tripId: string;
  dayId: string;
  segment: ItinerarySegmentDTO;
  index: number;
  count: number;
  canWrite: boolean;
}) {
  const [pending, start] = useTransition();
  const move = (dir: "up" | "down") =>
    start(() => void moveSegmentAction(tripId, dayId, segment.id, dir));

  const enrichment =
    (segment.transportMode ?? segment.mealType)
      ? ` · ${humanizeEnum(segment.transportMode ?? segment.mealType ?? "")}`
      : "";

  return (
    <li className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
      {canWrite ? (
        <MoveButtons
          onUp={() => move("up")}
          onDown={() => move("down")}
          disableUp={index === 0}
          disableDown={index === count - 1}
          pending={pending}
        />
      ) : (
        <span className="w-6 text-center text-xs tabular-nums text-muted-foreground">
          {index + 1}
        </span>
      )}
      <Badge variant={SEGMENT_VARIANT[segment.type] ?? "secondary"} className="shrink-0 capitalize">
        {humanizeEnum(segment.type)}
      </Badge>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {segment.title}
          <span className="font-normal text-muted-foreground">{enrichment}</span>
        </div>
        {segment.detail ? (
          <div className="truncate text-xs text-muted-foreground">{segment.detail}</div>
        ) : null}
      </div>
      {canWrite ? (
        <div className="flex items-center">
          <SegmentDialog
            tripId={tripId}
            dayId={dayId}
            segment={segment}
            trigger={
              <Button variant="ghost" size="icon" className="size-7" aria-label="Edit segment">
                <Pencil className="size-3.5" />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            aria-label="Delete segment"
            disabled={pending}
            onClick={() => start(() => void deleteSegmentAction(tripId, segment.id))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function DayCard({
  tripId,
  day,
  index,
  count,
  destinationOptions,
  canWrite,
}: {
  tripId: string;
  day: ItineraryDayDTO;
  index: number;
  count: number;
  destinationOptions: DestinationOption[];
  canWrite: boolean;
}) {
  const [pending, start] = useTransition();
  const move = (dir: "up" | "down") => start(() => void moveDayAction(tripId, day.id, dir));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 py-3">
        <div className="flex items-start gap-2">
          {canWrite ? (
            <MoveButtons
              onUp={() => move("up")}
              onDown={() => move("down")}
              disableUp={index === 0}
              disableDown={index === count - 1}
              pending={pending}
            />
          ) : null}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Day {day.dayNumber}</span>
              {day.fromName || day.toName ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {day.fromName ?? "—"}
                  <ArrowRight className="size-3" />
                  {day.toName ?? "—"}
                </span>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">{day.title}</div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex items-center">
            <DayDialog
              tripId={tripId}
              day={day}
              destinationOptions={destinationOptions}
              trigger={
                <Button variant="ghost" size="icon" className="size-7" aria-label="Edit day">
                  <Pencil className="size-3.5" />
                </Button>
              }
            />
            <ConfirmDialog
              title={`Delete Day ${day.dayNumber}?`}
              description="This removes the day and all its segments. Remaining days are renumbered. This cannot be undone."
              confirmLabel="Delete day"
              destructive
              onConfirm={() => deleteDayAction(tripId, day.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  aria-label="Delete day"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              }
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="py-3">
        {day.segments.length === 0 ? (
          <p className="text-xs text-muted-foreground">No segments yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {day.segments.map((s, i) => (
              <SegmentRow
                key={s.id}
                tripId={tripId}
                dayId={day.id}
                segment={s}
                index={i}
                count={day.segments.length}
                canWrite={canWrite}
              />
            ))}
          </ol>
        )}
        {canWrite ? (
          <SegmentDialog
            tripId={tripId}
            dayId={day.id}
            trigger={
              <Button variant="outline" size="sm" className="mt-2">
                <Plus />
                Add segment
              </Button>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ItineraryEditor({
  tripId,
  days,
  destinationOptions,
  canWrite,
}: {
  tripId: string;
  days: ItineraryDayDTO[];
  destinationOptions: DestinationOption[];
  canWrite: boolean;
}) {
  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex justify-end">
          <DayDialog
            tripId={tripId}
            destinationOptions={destinationOptions}
            trigger={
              <Button>
                <Plus />
                Add day
              </Button>
            }
          />
        </div>
      ) : null}

      {days.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No itinerary days yet"
          description={
            canWrite
              ? "Add the first day, then add ordered segments (transfer, meal, activity…)."
              : "This trip has no itinerary days yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {days.map((day, i) => (
            <DayCard
              key={day.id}
              tripId={tripId}
              day={day}
              index={i}
              count={days.length}
              destinationOptions={destinationOptions}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
