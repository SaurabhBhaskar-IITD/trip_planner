import { describe, it, expect } from "vitest";
import { Money } from "@/domain/shared/money";
import { computePrice, PRICING_ENGINE_VERSION } from "./engine";
import type { PricingContext, ResolvedLineInput } from "./types";

function baseContext(overrides: Partial<PricingContext> = {}): PricingContext {
  const baseInputs: ResolvedLineInput[] = [
    {
      kind: "accommodation",
      label: "Deluxe Double Room — Hotel X",
      unit: "per_room_per_night",
      unitPrice: Money.fromMajor(3500),
      quantity: 2, // 2 room-nights
      supplierUnitCost: Money.fromMajor(2800),
    },
    {
      kind: "activity",
      label: "Solang Valley sightseeing",
      unit: "per_person",
      unitPrice: Money.fromMajor(1800),
      quantity: 2,
      supplierUnitCost: Money.fromMajor(1400),
    },
  ];
  return {
    travelStartDate: new Date("2026-09-01"),
    travelEndDate: new Date("2026-09-03"),
    nights: 2,
    travellerCount: 2,
    baseInputs,
    rules: [],
    approvedRuleIds: [],
    ...overrides,
  };
}

describe("computePrice", () => {
  it("is deterministic — identical input yields identical output", () => {
    const a = computePrice(baseContext());
    const b = computePrice(baseContext());
    expect(a).toEqual(b);
  });

  it("sums snapshot line totals into the subtotal", () => {
    const result = computePrice(baseContext());
    // (3500 * 2) + (1800 * 2) = 7000 + 3600 = 10600
    expect(result.subtotalMinor).toBe(1060000);
    expect(result.grandTotalMinor).toBe(1060000);
    expect(result.engineVersion).toBe(PRICING_ENGINE_VERSION);
  });

  it("computes internal supplier cost and margin", () => {
    const result = computePrice(baseContext());
    // supplier: (2800*2) + (1400*2) = 5600 + 2800 = 8400
    expect(result.internal?.supplierCostTotalMinor).toBe(840000);
    // margin: 10600 - 8400 = 2200
    expect(result.internal?.marginTotalMinor).toBe(220000);
    expect(result.internal?.marginPercentage).toBeCloseTo(20.75, 2);
  });

  it("omits internal figures when includeInternal is false (public path)", () => {
    const result = computePrice(baseContext(), { includeInternal: false });
    expect(result.internal).toBeUndefined();
    for (const line of result.lines) {
      expect(line.internal).toBeUndefined();
    }
  });
});
