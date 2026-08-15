"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Calculator, Loader2, Save, Search } from "lucide-react";
import type { PlannerRequest, Occupancy } from "@/domain/planner/types";
import type {
  CustomerDTO,
  PlannerCalculationDTO,
  PlannerConfigDTO,
  TripOptionDTO,
} from "@/types/planner";
import { humanizeEnum } from "@/domain/shared/enums";
import { formatMinorAsINR } from "@/lib/utils/format";
import {
  calculatePlannerQuoteAction,
  loadPlannerConfigAction,
  savePlannerQuoteAction,
  searchCustomersAction,
} from "@/server/actions/planner.actions";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/common/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BreakdownTable } from "@/components/planner/breakdown-table";
import { ItineraryView } from "@/components/planner/itinerary-view";

export function PlannerWorkspace({
  trips,
  canViewInternal,
}: {
  trips: TripOptionDTO[];
  canViewInternal: boolean;
}) {
  const router = useRouter();

  // Customer
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [travellerCount, setTravellerCount] = useState(2);
  const [customerMatches, setCustomerMatches] = useState<CustomerDTO[]>([]);
  const [searching, startSearch] = useTransition();

  // Trip + config
  const [tripId, setTripId] = useState<string>("");
  const [config, setConfig] = useState<PlannerConfigDTO | null>(null);
  const [loadingConfig, startLoadConfig] = useTransition();
  const [travelDate, setTravelDate] = useState("");

  // Selections
  const [occupancy, setOccupancy] = useState<string>("");
  const [accommodationId, setAccommodationId] = useState<string>("");
  const [transportId, setTransportId] = useState<string>("");
  const [activityIds, setActivityIds] = useState<Set<string>>(new Set());
  const [mealIds, setMealIds] = useState<Set<string>>(new Set());
  const [addonIds, setAddonIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  // Result
  const [calc, setCalc] = useState<PlannerCalculationDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calculating, startCalc] = useTransition();
  const [saving, startSave] = useTransition();

  function resetSelections() {
    setOccupancy("");
    setAccommodationId("");
    setTransportId("");
    setActivityIds(new Set());
    setMealIds(new Set());
    setAddonIds(new Set());
    setCalc(null);
  }

  function onTripChange(id: string) {
    setTripId(id);
    setConfig(null);
    resetSelections();
    startLoadConfig(async () => {
      const res = await loadPlannerConfigAction(id);
      if (res.ok) setConfig(res.data);
      else setError(res.message);
    });
  }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
    setCalc(null);
  }

  // Accommodations that offer the chosen occupancy.
  const eligibleAccommodations = useMemo(() => {
    if (!config) return [];
    if (!occupancy) return config.accommodations;
    return config.accommodations.filter((a) =>
      a.roomTypes.some((rt) => rt.active && rt.occupancy === occupancy),
    );
  }, [config, occupancy]);

  function buildRequest(): PlannerRequest {
    return {
      customer: { id: customerId, name: name.trim(), phone: phone.trim(), email: email.trim() || undefined },
      tripId,
      travellerCount,
      travelStartDate: travelDate || undefined,
      accommodation:
        accommodationId && occupancy
          ? { accommodationId, occupancy: occupancy as Occupancy }
          : undefined,
      transportId: transportId || undefined,
      activityIds: [...activityIds],
      mealIds: [...mealIds],
      addonIds: [...addonIds],
      note: note.trim() || undefined,
    };
  }

  const canCalculate = Boolean(name.trim() && tripId && travellerCount >= 1);

  function onCalculate() {
    setError(null);
    startCalc(async () => {
      const res = await calculatePlannerQuoteAction(buildRequest());
      if (res.ok) setCalc(res.data);
      else setError(res.message);
    });
  }

  function onSave() {
    setError(null);
    startSave(async () => {
      const res = await savePlannerQuoteAction(buildRequest());
      if (res.ok) router.push(`/planner/quote/${res.data.quoteId}`);
      else setError(res.message);
    });
  }

  function onCustomerSearch() {
    const q = phone.trim() || name.trim();
    if (!q) return;
    startSearch(async () => {
      const res = await searchCustomersAction(q);
      if (res.ok) setCustomerMatches(res.data);
    });
  }

  function pickCustomer(c: CustomerDTO) {
    setCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setCustomerMatches([]);
  }

  return (
    <>
      <PageHeader
        title="Trip Planner"
        description="Build a customer quote from catalogue data — deterministic pricing, no invented values."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">1 · Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Customer name" htmlFor="cust-name" required>
                  <Input
                    id="cust-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setCustomerId(undefined);
                    }}
                    placeholder="e.g. Rahul Sharma"
                  />
                </FormField>
                <FormField label="Phone" htmlFor="cust-phone">
                  <div className="flex gap-2">
                    <Input
                      id="cust-phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setCustomerId(undefined);
                      }}
                      placeholder="+91 …"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={onCustomerSearch} aria-label="Find existing customer">
                      {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    </Button>
                  </div>
                </FormField>
              </div>
              {customerMatches.length > 0 ? (
                <div className="rounded-md border bg-muted/30 p-2 text-sm">
                  <div className="mb-1 text-xs text-muted-foreground">Existing customers — click to use:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {customerMatches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        {c.name}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Email (optional)" htmlFor="cust-email">
                  <Input id="cust-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                </FormField>
                <FormField label="Travellers" htmlFor="travellers" required>
                  <Input
                    id="travellers"
                    type="number"
                    min={1}
                    max={100}
                    value={travellerCount}
                    onChange={(e) => {
                      setTravellerCount(Math.max(1, Number.parseInt(e.target.value, 10) || 1));
                      setCalc(null);
                    }}
                  />
                </FormField>
              </div>
              {customerId ? (
                <p className="text-xs text-success">Using existing customer record.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">2 · Trip &amp; travel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Trip" htmlFor="trip" required>
                  <Select value={tripId} onValueChange={onTripChange}>
                    <SelectTrigger id="trip">
                      <SelectValue placeholder="Select a trip" />
                    </SelectTrigger>
                    <SelectContent>
                      {trips.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.durationNights}N/{t.durationDays}D)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  label="Departure date (optional)"
                  htmlFor="date"
                  hint="Resolves seasonal prices; omit for a date-independent quote."
                >
                  <Input id="date" type="date" value={travelDate} onChange={(e) => { setTravelDate(e.target.value); setCalc(null); }} />
                </FormField>
              </div>
              {loadingConfig ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading trip configuration…
                </p>
              ) : null}
              {config ? (
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {config.trip.destinations.map((d) => (
                    <Badge key={d.destinationId} variant="secondary">{d.name}</Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {config ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">3 · Accommodation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config.occupancies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No accommodation configured for this trip&apos;s destinations.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField label="Occupancy" htmlFor="occ">
                        <Select
                          value={occupancy}
                          onValueChange={(v) => { setOccupancy(v); setAccommodationId(""); setCalc(null); }}
                        >
                          <SelectTrigger id="occ">
                            <SelectValue placeholder="Choose sharing" />
                          </SelectTrigger>
                          <SelectContent>
                            {config.occupancies.map((o) => (
                              <SelectItem key={o} value={o}>{humanizeEnum(o)} sharing</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Property" htmlFor="acc">
                        <Select
                          value={accommodationId}
                          onValueChange={(v) => { setAccommodationId(v); setCalc(null); }}
                          disabled={!occupancy}
                        >
                          <SelectTrigger id="acc">
                            <SelectValue placeholder={occupancy ? "Choose property" : "Pick occupancy first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleAccommodations.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name} · {humanizeEnum(a.category)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">4 · Transport</CardTitle>
                </CardHeader>
                <CardContent>
                  {config.transport.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transport configured.</p>
                  ) : (
                    <FormField label="Transport option" htmlFor="tr">
                      <Select value={transportId} onValueChange={(v) => { setTransportId(v); setCalc(null); }}>
                        <SelectTrigger id="tr">
                          <SelectValue placeholder="Choose transport" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.transport.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} · {humanizeEnum(t.mode)} · cap {t.capacity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">5 · Activities, meals &amp; add-ons</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ToggleGroup
                    label="Activities"
                    items={config.activities.map((a) => ({ id: a.id, label: a.name }))}
                    selected={activityIds}
                    onToggle={(id) => toggle(activityIds, setActivityIds, id)}
                  />
                  <ToggleGroup
                    label="Meals"
                    items={config.meals.map((m) => ({ id: m.id, label: `${m.name} (${m.plan})` }))}
                    selected={mealIds}
                    onToggle={(id) => toggle(mealIds, setMealIds, id)}
                  />
                  <ToggleGroup
                    label="Add-ons"
                    items={config.addons.map((a) => ({ id: a.id, label: a.name }))}
                    selected={addonIds}
                    onToggle={(id) => toggle(addonIds, setAddonIds, id)}
                  />
                  <FormField label="Internal note (optional)" htmlFor="note">
                    <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. honeymoon couple" />
                  </FormField>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        {/* Summary / actions */}
        <div className="space-y-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle className="text-sm">Review &amp; calculate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <SummaryRow label="Customer" value={name || "—"} />
              <SummaryRow label="Travellers" value={String(travellerCount)} />
              <SummaryRow label="Trip" value={config?.trip.name ?? "—"} />
              <SummaryRow
                label="Accommodation"
                value={
                  accommodationId && occupancy
                    ? `${humanizeEnum(occupancy)} sharing`
                    : "—"
                }
              />
              <SummaryRow
                label="Transport"
                value={config?.transport.find((t) => t.id === transportId)?.name ?? "—"}
              />
              <SummaryRow label="Activities" value={String(activityIds.size)} />
              <SummaryRow label="Add-ons" value={String(addonIds.size)} />

              {error ? (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button className="w-full" onClick={onCalculate} disabled={!canCalculate || calculating}>
                {calculating ? <Loader2 className="animate-spin" /> : <Calculator />}
                Calculate price
              </Button>

              {calc ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {formatMinorAsINR(calc.grandTotalMinor)}
                  </div>
                  <Button
                    className="mt-3 w-full"
                    variant="default"
                    onClick={onSave}
                    disabled={!calc.ok || saving}
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    Save &amp; generate quote
                  </Button>
                  {!calc.ok ? (
                    <p className="mt-2 text-xs text-destructive">
                      Resolve the issues below before saving.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      {calc ? (
        <div className="mt-6 space-y-6">
          {calc.problems.length ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>
                <div className="font-medium">Cannot finalise this quote:</div>
                <ul className="mt-1 list-inside list-disc">
                  {calc.problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Allocation &amp; price breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <Badge variant="outline">
                  {calc.allocation.travellerCount} travellers · {calc.allocation.nights}N/{calc.allocation.days}D
                </Badge>
                {calc.allocation.rooms != null ? (
                  <Badge variant="outline">
                    {calc.allocation.rooms} {calc.allocation.occupancy ? `${humanizeEnum(calc.allocation.occupancy)} ` : ""}
                    room(s)
                  </Badge>
                ) : null}
                {calc.allocation.vehicles != null ? (
                  <Badge variant="outline">
                    {calc.allocation.vehicles} vehicle(s) · cap {calc.allocation.vehicleCapacity}
                  </Badge>
                ) : null}
              </div>
              <BreakdownTable
                lines={calc.lines.map((l) => ({
                  label: l.label,
                  allocationNote: l.allocationNote,
                  unit: l.unit,
                  quantity: l.quantity,
                  unitPriceMinor: l.unitPriceMinor,
                  lineTotalMinor: l.lineTotalMinor,
                  supplierCostMinor: l.supplierCostMinor,
                  marginMinor: l.marginMinor,
                  marginPercentage: l.marginPercentage,
                }))}
                subtotalMinor={calc.subtotalMinor}
                discountTotalMinor={calc.discountTotalMinor}
                taxTotalMinor={calc.taxTotalMinor}
                taxConfigured={calc.taxConfigured}
                grandTotalMinor={calc.grandTotalMinor}
                canViewInternal={canViewInternal}
                internal={calc.internal}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generated itinerary (preview)</CardTitle>
            </CardHeader>
            <CardContent>
              <ItineraryView doc={calc.itinerary} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function ToggleGroup({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None available.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => {
            const on = selected.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onToggle(it.id)}
                aria-pressed={on}
                className={
                  on
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    : "rounded-full border bg-card px-3 py-1 text-xs hover:bg-accent"
                }
              >
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
