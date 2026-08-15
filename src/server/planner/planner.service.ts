import "server-only";
import {
  accommodationRepository,
  activityRepository,
  addonRepository,
  customerRepository,
  mealRepository,
  parseListQuery,
  quoteStoreRepository,
  transportationRepository,
  tripOptionRepository,
  tripRepository,
} from "@/server/repositories";
import type { CreateQuoteItemData, CreateQuoteVersionData } from "@/server/repositories";
import { computePrice } from "@/domain/pricing/engine";
import type { PricingContext } from "@/domain/pricing/types";
import {
  generateItinerary,
  resolveConfiguration,
  PLANNER_VERSION,
  type PlannerRequest,
} from "@/domain/planner";
import type {
  AccommodationDetailDTO,
  ActivityDetailDTO,
  AddonDetailDTO,
  MealDetailDTO,
  TransportationDetailDTO,
} from "@/types/master-data";
import type {
  CalcLineDTO,
  PlannerCalculationDTO,
  PlannerConfigDTO,
  TripOptionDTO,
} from "@/types/planner";

const EPOCH = new Date(0);

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Active trips available to plan against. */
export async function listTripOptions(): Promise<TripOptionDTO[]> {
  const { items } = await tripRepository.list(parseListQuery({ status: "active" }, { pageSize: 100 }));
  return items.map((t) => ({
    id: t.id,
    name: t.name,
    durationDays: t.durationDays,
    durationNights: t.durationNights,
  }));
}

/**
 * Load everything a trip OFFERS (its explicit trip-options), with prices but no
 * internal $ — this reaches the client. Options come from the trip↔catalogue join
 * tables, not from destination derivation, so the planner shows exactly what the
 * trip is configured to offer.
 */
export async function loadConfig(tripId: string): Promise<PlannerConfigDTO | null> {
  const trip = await tripRepository.findDetail(tripId);
  if (!trip) return null;
  const opts = { includeInternal: false };

  const [accommodations, activities, transport, meals, addons] = await Promise.all([
    tripOptionRepository.listAccommodationOptions(tripId, opts),
    tripOptionRepository.listActivityOptions(tripId, opts),
    tripOptionRepository.listTransportOptions(tripId, opts),
    tripOptionRepository.listMealOptions(tripId, opts),
    tripOptionRepository.listAddonOptions(tripId, opts),
  ]);

  const occupancies = [
    ...new Set(
      accommodations.flatMap((a) => a.roomTypes.filter((rt) => rt.active).map((rt) => rt.occupancy)),
    ),
  ];

  return { trip, occupancies, accommodations, transport, activities, meals, addons };
}

interface LoadedSelection {
  trip: NonNullable<Awaited<ReturnType<typeof tripRepository.findDetail>>>;
  accommodation: AccommodationDetailDTO | null;
  transport: TransportationDetailDTO | null;
  activities: ActivityDetailDTO[];
  meals: MealDetailDTO[];
  addons: AddonDetailDTO[];
  problems: string[];
}

/**
 * Fetch (fresh, server-side) only the selected master data + validate that each
 * selection is an ACTIVE trip-option (§35). Membership is checked against the
 * trip↔catalogue join tables — a selection outside the trip's offered options is
 * rejected, never silently priced.
 */
async function loadSelection(
  request: PlannerRequest,
  includeInternal: boolean,
): Promise<LoadedSelection | null> {
  const trip = await tripRepository.findDetail(request.tripId);
  if (!trip) return null;
  const opts = { includeInternal };
  const problems: string[] = [];

  const [accIds, trIds, actIds, mealIds, addonIds, accommodation, transport, activitiesRaw, mealsRaw, addonsRaw] =
    await Promise.all([
      tripOptionRepository.enabledIds(request.tripId, "accommodation"),
      tripOptionRepository.enabledIds(request.tripId, "transportation"),
      tripOptionRepository.enabledIds(request.tripId, "activity"),
      tripOptionRepository.enabledIds(request.tripId, "meal"),
      tripOptionRepository.enabledIds(request.tripId, "addon"),
      request.accommodation
        ? accommodationRepository.findDetail(request.accommodation.accommodationId, opts)
        : Promise.resolve(null),
      request.transportId
        ? transportationRepository.findDetail(request.transportId, opts)
        : Promise.resolve(null),
      Promise.all(request.activityIds.map((id) => activityRepository.findDetail(id, opts))),
      Promise.all(request.mealIds.map((id) => mealRepository.findDetail(id, opts))),
      Promise.all(request.addonIds.map((id) => addonRepository.findDetail(id, opts))),
    ]);

  if (request.accommodation) {
    if (!accommodation) problems.push("Selected accommodation no longer exists.");
    else if (!accommodation.active) problems.push(`${accommodation.name} is inactive.`);
    else if (!accIds.has(accommodation.id))
      problems.push(`${accommodation.name} is not an available option for this trip.`);
  }

  if (request.transportId) {
    if (!transport) problems.push("Selected transport no longer exists.");
    else if (!transport.active) problems.push(`${transport.name} is inactive.`);
    else if (!trIds.has(transport.id))
      problems.push(`${transport.name} is not an available option for this trip.`);
  }

  const activities: ActivityDetailDTO[] = [];
  for (const a of activitiesRaw) {
    if (!a) problems.push("A selected activity no longer exists.");
    else if (!a.active) problems.push(`${a.name} is inactive.`);
    else if (!actIds.has(a.id)) problems.push(`${a.name} is not an available option for this trip.`);
    else activities.push(a);
  }

  const meals: MealDetailDTO[] = [];
  for (const m of mealsRaw) {
    if (!m) problems.push("A selected meal no longer exists.");
    else if (!m.active) problems.push(`${m.name} is inactive.`);
    else if (!mealIds.has(m.id)) problems.push(`${m.name} is not an available option for this trip.`);
    else meals.push(m);
  }

  const addons: AddonDetailDTO[] = [];
  for (const ad of addonsRaw) {
    if (!ad) problems.push("A selected add-on no longer exists.");
    else if (!ad.active) problems.push(`${ad.name} is inactive.`);
    else if (!addonIds.has(ad.id)) problems.push(`${ad.name} is not an available option for this trip.`);
    else addons.push(ad);
  }

  return { trip, accommodation: accommodation ?? null, transport: transport ?? null, activities, meals, addons, problems };
}

/** Deterministically price + generate the itinerary. Does NOT persist. */
export async function calculate(
  request: PlannerRequest,
  opts: { includeInternal: boolean },
): Promise<PlannerCalculationDTO> {
  const loaded = await loadSelection(request, opts.includeInternal);
  const empty = emptyCalc();
  if (!loaded) return { ...empty, problems: ["Trip not found."] };

  const { trip } = loaded;
  const travelDate = request.travelStartDate ? new Date(request.travelStartDate) : undefined;

  const resolved = resolveConfiguration({
    durationDays: trip.durationDays,
    durationNights: trip.durationNights,
    travellerCount: request.travellerCount,
    travelDate,
    accommodation: loaded.accommodation,
    occupancy: request.accommodation?.occupancy,
    transport: loaded.transport,
    activities: loaded.activities,
    meals: loaded.meals,
    addons: loaded.addons,
  });

  const problems = [...loaded.problems, ...resolved.problems];

  const context: PricingContext = {
    travelStartDate: travelDate ?? EPOCH,
    travelEndDate: travelDate ? addDays(travelDate, trip.durationDays - 1) : EPOCH,
    nights: trip.durationNights,
    travellerCount: request.travellerCount,
    baseInputs: resolved.lines,
    rules: [],
    approvedRuleIds: [],
  };
  const breakdown = computePrice(context, { includeInternal: opts.includeInternal });

  // breakdown.lines is parallel to resolved.lines/meta (no-op evaluator adds none).
  const lines: CalcLineDTO[] = breakdown.lines.map((line, i) => {
    const meta = resolved.meta[i];
    const dto: CalcLineDTO = {
      kind: line.kind,
      label: line.label,
      sourceId: line.sourceId,
      unit: line.unit,
      quantity: line.quantity,
      allocationNote: meta?.allocationNote ?? "",
      season: meta?.season ?? null,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
    };
    if (opts.includeInternal && line.internal) {
      dto.supplierCostMinor = line.internal.supplierCostMinor;
      dto.marginMinor = line.internal.marginMinor;
      dto.marginPercentage = line.internal.marginPercentage;
    }
    return dto;
  });

  const itinerary = generateItinerary({
    trip,
    customerName: request.customer.name || "Customer",
    travellerCount: request.travellerCount,
    occupancy: request.accommodation?.occupancy,
    accommodationName: loaded.accommodation?.name,
    transportName: loaded.transport?.name,
    transportMode: loaded.transport?.mode,
    activityNames: loaded.activities.map((a) => a.name),
    mealNames: loaded.meals.map((m) => m.name),
    addonNames: loaded.addons.map((a) => a.name),
  });

  return {
    ok: problems.length === 0,
    problems,
    currency: "INR",
    allocation: resolved.allocation,
    lines,
    subtotalMinor: breakdown.subtotalMinor,
    discountTotalMinor: breakdown.discountTotalMinor,
    taxTotalMinor: breakdown.taxTotalMinor,
    taxConfigured: false,
    grandTotalMinor: breakdown.grandTotalMinor,
    internal: opts.includeInternal ? breakdown.internal : undefined,
    itinerary,
    engineVersion: breakdown.engineVersion,
  };
}

function emptyCalc(): PlannerCalculationDTO {
  return {
    ok: false,
    problems: [],
    currency: "INR",
    allocation: { nights: 0, days: 0, travellerCount: 0 },
    lines: [],
    subtotalMinor: 0,
    discountTotalMinor: 0,
    taxTotalMinor: 0,
    taxConfigured: false,
    grandTotalMinor: 0,
    itinerary: {
      generatorVersion: PLANNER_VERSION,
      tripName: "",
      durationDays: 0,
      durationNights: 0,
      travellerCount: 0,
      preparedFor: "",
      days: [],
      inclusions: [],
      exclusions: [],
      notes: [],
    },
    engineVersion: "",
  };
}

/** Ensure a customer exists (reuse by id/phone; create otherwise) — avoids duplicates (§32). */
async function resolveCustomer(request: PlannerRequest): Promise<string> {
  if (request.customer.id) {
    const existing = await customerRepository.findById(request.customer.id);
    if (existing) return existing.id;
  }
  if (request.customer.phone) {
    const byPhone = await customerRepository.findByPhone(request.customer.phone);
    if (byPhone) return byPhone.id;
  }
  const created = await customerRepository.create({
    name: request.customer.name,
    phone: request.customer.phone,
    email: request.customer.email,
  });
  return created.id;
}

export interface SaveResult {
  ok: boolean;
  problems: string[];
  quoteId?: string;
  reference?: string;
  version?: number;
}

/** Calculate, freeze a snapshot, and persist as a new quote or a new version (§29, §30). */
export async function save(
  request: PlannerRequest,
  ctx: { userId?: string | null },
): Promise<SaveResult> {
  // Internal figures are always computed for storage; read-time gating decides
  // who can see them later.
  const calc = await calculate(request, { includeInternal: true });
  if (!calc.ok) return { ok: false, problems: calc.problems };

  const travelStart = request.travelStartDate ? new Date(request.travelStartDate) : null;
  const travelEnd =
    travelStart != null ? addDays(travelStart, calc.itinerary.durationDays - 1) : null;

  const items: CreateQuoteItemData[] = calc.lines.map((line, i) => ({
    sortOrder: i,
    componentType: line.kind,
    componentId: line.sourceId ?? null,
    componentNameSnapshot: line.label,
    descriptionSnapshot: line.allocationNote || null,
    quantity: line.quantity,
    unit: line.unit,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    supplierCostMinor: line.supplierCostMinor ?? null,
    marginMinor: line.marginMinor ?? null,
    marginPercentage: line.marginPercentage ?? null,
    pricingMetadataSnapshot: {
      allocationNote: line.allocationNote,
      season: line.season,
      unit: line.unit,
    },
  }));

  const versionData: CreateQuoteVersionData = {
    tripName: calc.itinerary.tripName,
    travelStartDate: travelStart,
    travelEndDate: travelEnd,
    travellerCount: request.travellerCount,
    selections: request,
    itinerary: calc.itinerary,
    subtotalMinor: calc.subtotalMinor,
    discountTotalMinor: calc.discountTotalMinor,
    taxTotalMinor: calc.taxTotalMinor,
    grandTotalMinor: calc.grandTotalMinor,
    supplierCostTotalMinor: calc.internal?.supplierCostTotalMinor ?? null,
    marginTotalMinor: calc.internal?.marginTotalMinor ?? null,
    marginPercentage: calc.internal?.marginPercentage ?? null,
    pricingEngineVersion: calc.engineVersion,
    note: request.note ?? null,
    createdById: ctx.userId ?? null,
    items,
  };

  const customerId = await resolveCustomer(request);

  if (request.quoteId) {
    const { version } = await quoteStoreRepository.addVersion(request.quoteId, versionData);
    return { ok: true, problems: [], quoteId: request.quoteId, version };
  }

  const created = await quoteStoreRepository.createQuote({
    tripId: request.tripId,
    customerId,
    createdById: ctx.userId ?? null,
    version: versionData,
  });
  return { ok: true, problems: [], quoteId: created.id, reference: created.reference, version: 1 };
}
