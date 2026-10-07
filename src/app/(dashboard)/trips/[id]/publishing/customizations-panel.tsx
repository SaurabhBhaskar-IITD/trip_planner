"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Power, PowerOff } from "lucide-react";
import {
  attachCustomizationAction,
  setBaseRoomOccupancyAction,
  setCustomizationActiveAction,
  updateCustomizationAction,
} from "@/server/actions/trip-publishing.actions";
import { ADDON_CATEGORY_LABEL, type AddonCategory } from "@/domain/shared/enums";
import { formatMinorAsINR } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BASIS_LABEL,
  propagationMessage,
  type AddonChoice,
  type CustomizationView,
  type NotifyStatus,
} from "./types";

const UNIT_OPTIONS = [
  { value: "per_person", label: "per person (whole trip)" },
  { value: "per_person_per_night", label: "per person, per night" },
  { value: "per_room", label: "per room (whole trip)" },
  { value: "per_room_per_night", label: "per room, per night" },
  { value: "per_night", label: "per night (whole booking)" },
  { value: "fixed", label: "per booking (flat)" },
] as const;
type OverrideUnit = (typeof UNIT_OPTIONS)[number]["value"];

const SECTIONS: Array<{ key: AddonCategory | "none"; title: string; hint?: string }> = [
  { key: "HOTEL_UPGRADE", title: "🏨 Hotel upgrades" },
  { key: "TRAVEL_UPGRADE", title: "🚐 Travel upgrades" },
  {
    key: "none",
    title: "Not offered to customers",
    hint: "Uncategorised add-ons (activities, insurance, …) are kept for internal quotes and history but are not shown in the trip-le.com customization flow.",
  },
];

/**
 * The trip's CUSTOMIZATIONS as sold on trip-le.com. Activating/deactivating
 * takes effect for NEW bookings immediately; bookings already paid keep exactly
 * what they bought (frozen on the booking itself).
 */
export function CustomizationsPanel({
  tripId,
  rows,
  available,
  canWrite,
  canPrice,
  canViewInternal,
  baseRoomOccupancy,
  nights,
}: {
  tripId: string;
  rows: CustomizationView[];
  available: AddonChoice[];
  canWrite: boolean;
  canPrice: boolean;
  canViewInternal: boolean;
  baseRoomOccupancy: number | null;
  nights: number | null;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState("");
  const [occupancy, setOccupancy] = useState(baseRoomOccupancy == null ? "" : String(baseRoomOccupancy));
  const [, startTransition] = useTransition();
  const activeCount = rows.filter((r) => r.active).length;

  function run(key: string, fn: () => Promise<{ ok: true; notify?: NotifyStatus } | { ok: false; message: string }>) {
    setPendingKey(key);
    setMessage(null);
    startTransition(async () => {
      const res = await fn();
      setMessage(
        res.ok
          ? { text: res.notify ? propagationMessage(res.notify) : "Saved.", error: false }
          : { text: res.message, error: true },
      );
      setPendingKey(null);
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  }

  const toggle = (row: CustomizationView) =>
    run(row.addonId, async () => {
      const res = await setCustomizationActiveAction(tripId, row.addonId, !row.active);
      return res.ok ? { ok: true, notify: res.data.notify.status } : res;
    });

  const attach = () =>
    toAdd &&
    run("attach", async () => {
      const res = await attachCustomizationAction(tripId, toAdd);
      setToAdd("");
      return res.ok ? { ok: true as const } : res;
    });

  const saveOccupancy = () =>
    run("occupancy", async () => {
      const value = occupancy.trim() === "" ? null : Number.parseInt(occupancy, 10);
      const res = await setBaseRoomOccupancyAction(tripId, value);
      return res.ok ? { ok: true, notify: res.data.notify.status } : res;
    });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">
          Customizations · {activeCount} active of {rows.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Active hotel and travel upgrades are offered on trip-le.com. Deactivating removes one for new bookings only —
          customers who already paid keep it at the price they paid.
        </p>

        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-sm sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="base-occupancy">Base room occupancy (travellers per room)</Label>
            <p className="text-xs text-muted-foreground">
              Used to count rooms for per-room prices (4 = quad, 2 = twin). Nights:{" "}
              {nights == null ? "not set — per-night prices can't be sold" : nights}.
            </p>
          </div>
          <Input
            id="base-occupancy"
            type="number"
            min={1}
            max={12}
            className="sm:w-24"
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value)}
            disabled={!canPrice}
            placeholder="—"
          />
          {canPrice ? (
            <Button size="sm" variant="outline" onClick={saveOccupancy} disabled={pendingKey !== null}>
              {pendingKey === "occupancy" ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          ) : null}
        </div>

        {message ? (
          <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-destructive" : "text-muted-foreground"}`}>
            {message.text}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customizations yet. Add one from the catalogue below.</p>
        ) : (
          SECTIONS.map((section) => {
            const sectionRows = rows.filter((r) => (r.category ?? "none") === section.key);
            if (sectionRows.length === 0) return null;
            return (
              <section key={section.key} className="space-y-2">
                <h3 className="text-sm font-semibold">{section.title}</h3>
                {section.hint ? <p className="text-xs text-muted-foreground">{section.hint}</p> : null}
                <ul className="grid gap-3 md:grid-cols-2">
                  {sectionRows.map((row) => (
                    <li key={row.addonId} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">{row.name}</div>
                          {row.description ? (
                            <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                          ) : null}
                        </div>
                        <span className={`flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${row.active ? "text-success" : "text-muted-foreground"}`}>
                          <span className={`size-2 rounded-full ${row.active ? "bg-success" : "bg-muted-foreground/60"}`} aria-hidden="true" />
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="text-sm">
                        {row.onRequest ? (
                          <span className="font-semibold">Price on request</span>
                        ) : row.sellable && row.priceMinor != null && row.chargeBasis ? (
                          <span className="font-semibold tabular-nums">
                            {row.priceMinor === 0 ? "Included" : `+${formatMinorAsINR(row.priceMinor)}`}
                            {row.priceMinor === 0 ? null : (
                              <span className="font-normal text-muted-foreground"> / {BASIS_LABEL[row.chargeBasis]}</span>
                            )}
                            {row.priceSource === "override" ? (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">(trip price)</span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-xs text-warning">Not sold online: {row.reason}</span>
                        )}
                      </div>

                      {row.internal ? (
                        <div className="rounded border border-dashed px-2 py-1 text-xs text-muted-foreground">
                          <span className="font-semibold">Internal · </span>
                          Supplier cost:{" "}
                          {row.internal.supplierCostOverrideMinor == null
                            ? "not set"
                            : formatMinorAsINR(row.internal.supplierCostOverrideMinor)}
                          {" · "}Margin:{" "}
                          {row.internal.marginMinor == null ? "—" : formatMinorAsINR(row.internal.marginMinor)}
                          {row.internal.note ? <p className="mt-1 whitespace-pre-wrap">{row.internal.note}</p> : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {row.category ? <Badge variant="secondary">{ADDON_CATEGORY_LABEL[row.category]}</Badge> : null}
                        {row.isRecommended ? <Badge variant="secondary">Recommended</Badge> : null}
                        {row.exclusiveGroup ? <Badge variant="secondary">Pick one: {row.exclusiveGroup}</Badge> : null}
                        {row.isDefault ? <Badge variant="secondary">Pre-selected</Badge> : null}
                        {row.roomOccupancy ? <Badge variant="secondary">{row.roomOccupancy} per room</Badge> : null}
                        {row.availabilityNote ? <Badge variant="secondary">{row.availabilityNote}</Badge> : null}
                        {!row.masterActive ? <Badge variant="secondary">Catalogue item inactive</Badge> : null}
                      </div>

                      {canWrite ? (
                        <div className="mt-auto flex flex-wrap gap-2 pt-1">
                          <Button size="sm" variant={row.active ? "outline" : "default"} onClick={() => toggle(row)} disabled={pendingKey !== null}>
                            {pendingKey === row.addonId ? <Loader2 className="animate-spin" /> : row.active ? <PowerOff /> : <Power />}
                            {row.active ? "Disable" : "Enable"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(editing === row.addonId ? null : row.addonId)}>
                            <Pencil />
                            Edit
                          </Button>
                        </div>
                      ) : null}

                      {editing === row.addonId ? (
                        <EditForm
                          row={row}
                          canPrice={canPrice}
                          canViewInternal={canViewInternal}
                          busy={pendingKey === `edit:${row.addonId}`}
                          onSave={(patch) =>
                            run(`edit:${row.addonId}`, async () => {
                              const res = await updateCustomizationAction(tripId, row.addonId, patch);
                              return res.ok ? { ok: true, notify: res.data.notify.status } : res;
                            })
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {canWrite && available.length > 0 ? (
          <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="add-customization">Add from catalogue</Label>
              <Select value={toAdd} onValueChange={setToAdd}>
                <SelectTrigger id="add-customization">
                  <SelectValue placeholder="Choose an add-on" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.category ? ` · ${ADDON_CATEGORY_LABEL[a.category]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={attach} disabled={!toAdd || pendingKey !== null}>
              {pendingKey === "attach" ? <Loader2 className="animate-spin" /> : <Plus />}
              Add (inactive)
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EditForm({
  row,
  canPrice,
  canViewInternal,
  busy,
  onSave,
}: {
  row: CustomizationView;
  canPrice: boolean;
  canViewInternal: boolean;
  busy: boolean;
  onSave: (patch: Parameters<typeof updateCustomizationAction>[2]) => void;
}) {
  const hasOverride = row.priceOverrideMinor != null;
  const initialUnit: OverrideUnit =
    row.priceOverrideUnit === "per_group"
      ? "fixed"
      : (UNIT_OPTIONS.find((u) => u.value === row.priceOverrideUnit)?.value ?? "per_person");
  const [useOverride, setUseOverride] = useState(hasOverride);
  const [amount, setAmount] = useState(hasOverride ? String(row.priceOverrideMinor! / 100) : "");
  const [unit, setUnit] = useState<OverrideUnit>(initialUnit);
  const [onRequest, setOnRequest] = useState(row.priceOnRequest);
  const [recommended, setRecommended] = useState(row.isRecommended);
  const [availability, setAvailability] = useState(row.availabilityNote ?? "");
  const [roomOcc, setRoomOcc] = useState(row.roomOccupancy == null ? "" : String(row.roomOccupancy));
  const [description, setDescription] = useState(row.descriptionOverride ?? "");
  const [group, setGroup] = useState(row.exclusiveGroup ?? "");
  const [order, setOrder] = useState(String(row.sortOrder));
  const [isDefault, setIsDefault] = useState(row.isDefault);
  const [note, setNote] = useState(row.internal?.note ?? "");
  const [supplierCost, setSupplierCost] = useState(
    row.internal?.supplierCostOverrideMinor == null ? "" : String(row.internal.supplierCostOverrideMinor / 100),
  );
  const id = (f: string) => `${row.addonId}-${f}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      descriptionOverride: description,
      exclusiveGroup: group,
      sortOrder: Number.parseInt(order, 10) || 0,
      isDefault,
      isRecommended: recommended,
      availabilityNote: availability,
      roomOccupancy: roomOcc.trim() === "" ? null : Number.parseInt(roomOcc, 10),
      ...(canPrice
        ? {
            priceOnRequest: onRequest,
            priceOverride: useOverride ? { amountRupees: Number(amount), unit } : null,
          }
        : {}),
      ...(canViewInternal
        ? {
            note,
            ...(canPrice ? { supplierCostRupees: supplierCost.trim() === "" ? null : Number(supplierCost) } : {}),
          }
        : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
      {canPrice ? (
        <fieldset className="space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={onRequest} onChange={(e) => setOnRequest(e.target.checked)} />
            Price on request (shown for enquiry only — never bookable online)
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
            Set a trip-specific price (otherwise the catalogue price is used)
          </label>
          {useOverride ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={id("amount")}>Selling price (₹)</Label>
                <Input id={id("amount")} type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor={id("unit")}>Charged</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as OverrideUnit)}>
                  <SelectTrigger id={id("unit")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </fieldset>
      ) : (
        <p className="text-xs text-muted-foreground">Price changes need the pricing permission.</p>
      )}
      {canViewInternal ? (
        <fieldset className="grid grid-cols-1 gap-2 rounded border border-dashed p-2">
          <legend className="px-1 text-xs font-semibold">Internal (never shown to customers)</legend>
          {canPrice ? (
            <div className="space-y-1">
              <Label htmlFor={id("cost")}>Supplier cost (₹, same unit as the selling price)</Label>
              <Input id={id("cost")} type="number" min={0} step="0.01" value={supplierCost} onChange={(e) => setSupplierCost(e.target.value)} placeholder="Unknown" />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor={id("note")}>Internal notes</Label>
            <Input id={id("note")} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Supplier, terms, caveats" />
          </div>
        </fieldset>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor={id("desc")}>Description for customers</Label>
        <Input id={id("desc")} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Leave blank to use the catalogue description" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={id("avail")}>Availability note for customers</Label>
        <Input id={id("avail")} value={availability} maxLength={200} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Subject to availability on your dates" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={id("group")}>Pick-one group</Label>
          <Input id={id("group")} value={group} maxLength={40} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. sharing" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("occ")}>Per room</Label>
          <Input id={id("occ")} type="number" min={1} max={12} value={roomOcc} onChange={(e) => setRoomOcc(e.target.value)} placeholder="Base" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("order")}>Display order</Label>
          <Input id={id("order")} type="number" min={0} max={9999} value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Pre-selected for customers
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} />
          Recommended
        </label>
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}
