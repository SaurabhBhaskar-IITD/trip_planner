"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Power, PowerOff } from "lucide-react";
import {
  attachCustomizationAction,
  setCustomizationActiveAction,
  updateCustomizationAction,
} from "@/server/actions/trip-publishing.actions";
import { formatMinorAsINR } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { propagationMessage, type AddonChoice, type CustomizationView, type NotifyStatus } from "./types";

const BASIS_LABEL = { per_person: "person", per_booking: "booking" } as const;
const UNIT_OPTIONS = [
  { value: "per_person", label: "per person" },
  { value: "fixed", label: "per booking (flat)" },
] as const;

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
}: {
  tripId: string;
  rows: CustomizationView[];
  available: AddonChoice[];
  canWrite: boolean;
  canPrice: boolean;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState("");
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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">
          Customizations · {activeCount} active of {rows.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Active customizations are offered on trip-le.com. Deactivating removes one for new bookings only —
          customers who already paid keep it at the price they paid.
        </p>

        {message ? (
          <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-destructive" : "text-muted-foreground"}`}>
            {message.text}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No customizations yet. Add one from the catalogue below.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
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
                  {row.sellable && row.priceMinor != null && row.chargeBasis ? (
                    <span className="font-semibold tabular-nums">
                      {row.priceMinor === 0 ? "Included" : formatMinorAsINR(row.priceMinor)}
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

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {row.exclusiveGroup ? <Badge variant="secondary">Pick one: {row.exclusiveGroup}</Badge> : null}
                  {row.isDefault ? <Badge variant="secondary">Pre-selected</Badge> : null}
                  {!row.masterActive ? <Badge variant="secondary">Catalogue item inactive</Badge> : null}
                </div>

                {canWrite ? (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant={row.active ? "outline" : "default"} onClick={() => toggle(row)} disabled={pendingKey !== null}>
                      {pendingKey === row.addonId ? <Loader2 className="animate-spin" /> : row.active ? <PowerOff /> : <Power />}
                      {row.active ? "Deactivate" : "Activate"}
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
  busy,
  onSave,
}: {
  row: CustomizationView;
  canPrice: boolean;
  busy: boolean;
  onSave: (patch: Parameters<typeof updateCustomizationAction>[2]) => void;
}) {
  const hasOverride = row.priceOverrideMinor != null;
  const [useOverride, setUseOverride] = useState(hasOverride);
  const [amount, setAmount] = useState(hasOverride ? String(row.priceOverrideMinor! / 100) : "");
  const [unit, setUnit] = useState(row.priceOverrideUnit === "fixed" || row.priceOverrideUnit === "per_group" ? "fixed" : "per_person");
  const [description, setDescription] = useState(row.descriptionOverride ?? "");
  const [group, setGroup] = useState(row.exclusiveGroup ?? "");
  const [order, setOrder] = useState(String(row.sortOrder));
  const [isDefault, setIsDefault] = useState(row.isDefault);
  const id = (f: string) => `${row.addonId}-${f}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      descriptionOverride: description,
      exclusiveGroup: group,
      sortOrder: Number.parseInt(order, 10) || 0,
      isDefault,
      ...(canPrice
        ? {
            priceOverride: useOverride
              ? { amountRupees: Number(amount), unit: unit as "per_person" | "fixed" }
              : null,
          }
        : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
      {canPrice ? (
        <fieldset className="space-y-2">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={useOverride} onChange={(e) => setUseOverride(e.target.checked)} />
            Set a trip-specific price (otherwise the catalogue price is used)
          </label>
          {useOverride ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={id("amount")}>Price (₹)</Label>
                <Input id={id("amount")} type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor={id("unit")}>Charged</Label>
                <Select value={unit} onValueChange={setUnit}>
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
      <div className="space-y-1">
        <Label htmlFor={id("desc")}>Description for customers</Label>
        <Input id={id("desc")} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Leave blank to use the catalogue description" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={id("group")}>Pick-one group</Label>
          <Input id={id("group")} value={group} maxLength={40} onChange={(e) => setGroup(e.target.value)} placeholder="e.g. sharing" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("order")}>Display order</Label>
          <Input id={id("order")} type="number" min={0} max={9999} value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Pre-selected for customers
      </label>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}
