import { describe, it, expect } from "vitest";
import { computePrice } from "@/domain/pricing/engine";
import type {
  AccommodationDetailDTO,
  ActivityDetailDTO,
  AddonDetailDTO,
  PriceDTO,
  TransportationDetailDTO,
} from "@/types/master-data";
import { resolveConfiguration } from "./resolver";
import type { ResolveInput } from "./types";

const now = new Date();

function price(over: Partial<PriceDTO> & { id: string; amountMinor: number }): PriceDTO {
  return {
    currency: "INR",
    unit: "per_person",
    season: null,
    validFrom: null,
    validUntil: null,
    minPax: null,
    maxPax: null,
    active: true,
    ...over,
  };
}

function accommodation(prices: PriceDTO[], occupancy = "double"): AccommodationDetailDTO {
  return {
    id: "acc1",
    name: "Hotel Snow Valley",
    destinationId: "d1",
    destinationName: "Manali",
    category: "deluxe",
    starRating: 3,
    description: null,
    amenities: [],
    active: true,
    roomTypes: [
      {
        id: "rt1",
        accommodationId: "acc1",
        name: "Deluxe Room",
        occupancy: occupancy as AccommodationDetailDTO["roomTypes"][number]["occupancy"],
        category: "deluxe",
        maxOccupancy: null,
        active: true,
        prices,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function transport(prices: PriceDTO[], capacity = 12): TransportationDetailDTO {
  return {
    id: "tr1",
    name: "Private Tempo Traveller",
    mode: "tempo_traveller",
    provider: null,
    vehicleType: null,
    capacity,
    routeFrom: "Manali",
    routeTo: "Kasol",
    active: true,
    prices,
    createdAt: now,
    updatedAt: now,
  };
}

function activity(prices: PriceDTO[]): ActivityDetailDTO {
  return {
    id: "act1",
    name: "Paragliding",
    destinationId: "d1",
    destinationName: "Manali",
    type: "adventure",
    description: null,
    durationMinutes: 30,
    active: true,
    prices,
    createdAt: now,
    updatedAt: now,
  };
}

function addon(prices: PriceDTO[]): AddonDetailDTO {
  return {
    id: "ad1",
    name: "Airport Transfer",
    description: null,
    active: true,
    prices,
    createdAt: now,
    updatedAt: now,
  };
}

function baseInput(over: Partial<ResolveInput> = {}): ResolveInput {
  return {
    durationDays: 7,
    durationNights: 6,
    travellerCount: 6,
    accommodation: accommodation([
      price({ id: "p1", amountMinor: 450000, unit: "per_room_per_night" }),
    ]),
    occupancy: "double",
    transport: transport([price({ id: "p2", amountMinor: 800000, unit: "per_vehicle" })]),
    activities: [activity([price({ id: "p3", amountMinor: 180000, unit: "per_person" })])],
    meals: [],
    addons: [addon([price({ id: "p4", amountMinor: 250000, unit: "fixed" })])],
    ...over,
  };
}

describe("resolveConfiguration — the Rahul case (§37)", () => {
  it("allocates rooms/vehicles and applies each pricing unit correctly", () => {
    const res = resolveConfiguration(baseInput());
    expect(res.ok).toBe(true);
    expect(res.allocation.rooms).toBe(3); // 6 / double
    expect(res.allocation.vehicles).toBe(1); // 6 / cap 12

    const byLabel = Object.fromEntries(res.meta.map((m) => [m.label.split(" —")[0], m]));
    // per_room_per_night → rooms(3) × nights(6) = 18
    expect(res.meta.find((m) => m.kind === "accommodation")?.quantity).toBe(18);
    // per_vehicle → 1
    expect(byLabel["Private Tempo Traveller"]?.quantity).toBe(1);
    // per_person → travellers(6)
    expect(byLabel["Paragliding"]?.quantity).toBe(6);
    // fixed → 1
    expect(byLabel["Airport Transfer"]?.quantity).toBe(1);
  });

  it("prices deterministically through the engine", () => {
    const res = resolveConfiguration(baseInput());
    const breakdown = computePrice({
      travelStartDate: new Date(0),
      travelEndDate: new Date(0),
      nights: 6,
      travellerCount: 6,
      baseInputs: res.lines,
      rules: [],
      approvedRuleIds: [],
    });
    // 4500×18 + 8000×1 + 1800×6 + 2500×1 = 81000 + 8000 + 10800 + 2500 = 102300
    expect(breakdown.subtotalMinor).toBe(10230000);
    expect(breakdown.grandTotalMinor).toBe(10230000);
  });
});

describe("resolveConfiguration — validation (§35, §38)", () => {
  it("blocks when a selected component has no price (CASE 6)", () => {
    const res = resolveConfiguration(baseInput({ activities: [activity([])] }));
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => /not configured for activity/i.test(p))).toBe(true);
  });

  it("blocks when the only price is inactive (CASE 7)", () => {
    const res = resolveConfiguration(
      baseInput({ addons: [addon([price({ id: "x", amountMinor: 250000, unit: "fixed", active: false })])] }),
    );
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => /not configured for add-on/i.test(p))).toBe(true);
  });

  it("blocks when two active prices are ambiguous (§14)", () => {
    const res = resolveConfiguration(
      baseInput({
        addons: [
          addon([
            price({ id: "g1", amountMinor: 250000, unit: "fixed", season: "all" }),
            price({ id: "g2", amountMinor: 300000, unit: "fixed", season: null }),
          ]),
        ],
      }),
    );
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => /ambiguous/i.test(p))).toBe(true);
  });

  it("blocks when the occupancy is not configured", () => {
    const res = resolveConfiguration(baseInput({ occupancy: "quad" }));
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => /not configured/i.test(p))).toBe(true);
  });

  it("blocks when vehicle capacity is zero", () => {
    const res = resolveConfiguration(
      baseInput({ transport: transport([price({ id: "p2", amountMinor: 800000, unit: "per_vehicle" })], 0) }),
    );
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => /capacity is not configured/i.test(p))).toBe(true);
  });

  it("requires at least one traveller", () => {
    const res = resolveConfiguration(baseInput({ travellerCount: 0 }));
    expect(res.ok).toBe(false);
  });

  it("uses vehicle capacity, not traveller count, for a 13-pax group (CASE 5)", () => {
    const res = resolveConfiguration(baseInput({ travellerCount: 13 }));
    expect(res.allocation.vehicles).toBe(2); // ceil(13/12)
    expect(res.meta.find((m) => m.kind === "transport")?.quantity).toBe(2);
  });
});
