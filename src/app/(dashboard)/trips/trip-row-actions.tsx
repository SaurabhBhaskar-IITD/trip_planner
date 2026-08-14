"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive, Copy, MoreHorizontal, Pencil, Play, Pause } from "lucide-react";
import type { TripListItemDTO } from "@/types/master-data";
import type { TripStatus } from "@/domain/shared/enums";
import { duplicateTripAction, setTripStatusAction } from "@/server/actions/trip.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TripRowActions({ trip }: { trip: TripListItemDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setStatus = (status: TripStatus) =>
    startTransition(() => {
      void setTripStatusAction(trip.id, status);
    });

  const duplicate = () =>
    startTransition(async () => {
      const res = await duplicateTripAction(trip.id);
      if (res.ok) router.push(`/trips/${res.data.id}`);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Trip actions" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => router.push(`/trips/${trip.id}/edit`)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={duplicate}>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {trip.status !== "active" ? (
          <DropdownMenuItem onSelect={() => setStatus("active")}>
            <Play />
            Set active
          </DropdownMenuItem>
        ) : null}
        {trip.status !== "draft" ? (
          <DropdownMenuItem onSelect={() => setStatus("draft")}>
            <Pause />
            Set to draft
          </DropdownMenuItem>
        ) : null}
        {trip.status !== "archived" ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setStatus("archived")}
          >
            <Archive />
            Archive
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
