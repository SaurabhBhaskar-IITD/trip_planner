"use client";

import { useState, useTransition } from "react";
import { Globe, EyeOff, Loader2 } from "lucide-react";
import type { TripStatus } from "@/domain/shared/enums";
import { setTripStatusAction } from "@/server/actions/trip.actions";
import { setPublicOptionsEnabledAction } from "@/server/actions/trip-publishing.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { propagationMessage } from "./types";

const LABEL: Record<TripStatus, { text: string; tone: string; dot: string; hint: string }> = {
  active: {
    text: "Published",
    tone: "text-success",
    dot: "bg-success",
    hint: "Open for booking on trip-le.com with its active customizations.",
  },
  draft: {
    text: "Draft",
    tone: "text-muted-foreground",
    dot: "bg-muted-foreground",
    hint: "Not bookable on trip-le.com.",
  },
  archived: {
    text: "Archived",
    tone: "text-muted-foreground",
    dot: "bg-muted-foreground",
    hint: "Retired — not bookable on trip-le.com.",
  },
};

/**
 * Publication control. `active` is the existing trip status that means PUBLISHED:
 * the public API serves only active trips, so this switch opens/closes online
 * booking. Existing bookings are unaffected either way.
 */
export function PublicationStatusCard({
  tripId,
  status: initial,
  publicOptionsEnabled: initialOwned,
  canWrite,
}: {
  tripId: string;
  status: TripStatus;
  publicOptionsEnabled: boolean;
  canWrite: boolean;
}) {
  const [status, setStatus] = useState(initial);
  const [owned, setOwned] = useState(initialOwned);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const view = LABEL[status];

  function change(next: TripStatus) {
    setMessage(null);
    startTransition(async () => {
      const res = await setTripStatusAction(tripId, next);
      if (res.ok) {
        setStatus(next);
        setMessage({ text: propagationMessage(res.data.notify.status), error: false });
      } else {
        setMessage({ text: res.message, error: true });
      }
    });
  }

  function changeOwnership(next: boolean) {
    setMessage(null);
    setOwned(next); // optimistic
    startTransition(async () => {
      const res = await setPublicOptionsEnabledAction(tripId, next);
      if (res.ok) setMessage({ text: propagationMessage(res.data.notify.status), error: false });
      else {
        setOwned(!next);
        setMessage({ text: res.message, error: true });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Publication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${view.dot}`} aria-hidden="true" />
          <span className={`font-semibold uppercase tracking-wide ${view.tone}`}>{view.text}</span>
        </div>
        <p className="text-muted-foreground">{view.hint}</p>
        {canWrite ? (
          status === "active" ? (
            <Button variant="outline" size="sm" onClick={() => change("draft")} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <EyeOff />}
              Unpublish
            </Button>
          ) : (
            <Button size="sm" onClick={() => change("active")} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Globe />}
              Publish
            </Button>
          )
        ) : null}
        {/* Who controls this trip's customizations on trip-le.com. */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Customizations on trip-le.com</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {owned
                  ? "Controlled here — the website offers exactly the customizations below."
                  : "Not controlled here — the website still uses its own built-in add-ons for this trip."}
              </p>
            </div>
            <Switch
              checked={owned}
              onCheckedChange={changeOwnership}
              disabled={!canWrite || pending}
              aria-label="Control this trip's customizations from the planner"
            />
          </div>
          {owned && status !== "active" ? (
            <p className="text-xs text-warning">
              Publish the trip as well — while it is {LABEL[status].text.toLowerCase()}, it cannot be booked online.
            </p>
          ) : null}
        </div>

        {message ? (
          <p role={message.error ? "alert" : "status"} className={message.error ? "text-destructive" : "text-muted-foreground"}>
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
