import { describe, expect, it } from "vitest";
import type { PriceDTO } from "@/types/master-data";
import {
  chargeQuantity,
  customizationTotalMinor,
  evaluateCustomization,
  marginMinor,
  type CustomizationInput,
} from "./customization";

function price(p: Partial<PriceDTO>): PriceDTO {
  return {
    id: p.id ?? "p1",
    amountMinor: p.amountMinor ?? 150_000,
    currency: "INR",
    unit: p.unit ?? "per_person",
    season: p.season ?? "all",
    validFrom: p.validFrom ?? null,
    validUntil: p.validUntil ?? null,
    minPax: null,
    maxPax: null,
    active: p.active ?? true,
  };
}

function input(p: Partial<CustomizationInput> = {}): CustomizationInput {
  return {
    active: true,
    masterActive: true,
    priceOverrideMinor: null,
    priceOverrideUnit: null,
    masterPrices: [price({})],
    ...p,
  };
}

describe("evaluateCustomization — what may be sold online", () => {
  it("sells an active option at its single catalogue price", () => {
    const r = evaluateCustomization(input());
    expect(r).toEqual({
      sellable: true,
      onRequest: false,
      priceMinor: 150_000,
      unit: "per_person",
      chargeBasis: "per_person",
      source: "catalogue",
    });
  });

  it("withholds an option deactivated for the trip", () => {
    expect(evaluateCustomization(input({ active: false })).sellable).toBe(false);
  });

  it("withholds an option whose master add-on is inactive", () => {
    expect(evaluateCustomization(input({ masterActive: false })).sellable).toBe(false);
  });

  it("uses the trip-specific override instead of the catalogue price", () => {
    const r = evaluateCustomization(input({ priceOverrideMinor: 400_000, priceOverrideUnit: "fixed" }));
    expect(r).toMatchObject({ sellable: true, priceMinor: 400_000, chargeBasis: "per_booking", source: "override" });
  });

  it("refuses a half-configured override rather than guessing", () => {
    const r = evaluateCustomization(input({ priceOverrideMinor: 400_000, priceOverrideUnit: null }));
    expect(r.sellable).toBe(false);
  });

  it("withholds an option with no active price", () => {
    const r = evaluateCustomization(input({ masterPrices: [price({ active: false })] }));
    expect(r).toMatchObject({ sellable: false, reason: expect.stringMatching(/no active price/i) });
  });

  it("withholds an option whose pricing is ambiguous", () => {
    const r = evaluateCustomization(input({ masterPrices: [price({ id: "a" }), price({ id: "b", amountMinor: 1 })] }));
    expect(r).toMatchObject({ sellable: false, reason: expect.stringMatching(/ambiguous/i) });
  });

  it("withholds room/night units when the trip lacks occupancy or nights, and allocation units always", () => {
    for (const unit of ["per_room", "per_room_per_night", "per_vehicle", "per_night", "percentage", "per_day"] as const) {
      const r = evaluateCustomization(input({ masterPrices: [price({ unit })] }));
      expect(r.sellable, unit).toBe(false);
    }
  });

  it("sells night- and room-based units once the trip supplies nights and occupancy", () => {
    const ctx = { nights: 3, baseRoomOccupancy: 4 };
    const cases = [
      ["per_person_per_night", "per_person_per_night"],
      ["per_room", "per_room"],
      ["per_room_per_night", "per_room_per_night"],
      ["per_night", "per_night"],
    ] as const;
    for (const [unit, basis] of cases) {
      const r = evaluateCustomization(input({ ...ctx, masterPrices: [price({ unit })] }));
      expect(r, unit).toMatchObject({ sellable: true, chargeBasis: basis });
    }
  });

  it("accepts an option's own room occupancy when the trip has none", () => {
    const r = evaluateCustomization(
      input({ nights: 2, roomOccupancy: 2, priceOverrideMinor: 100_000, priceOverrideUnit: "per_room_per_night" }),
    );
    expect(r).toMatchObject({ sellable: true, chargeBasis: "per_room_per_night" });
  });

  it("offers price-on-request options for enquiry only, without needing a price", () => {
    const r = evaluateCustomization(input({ priceOnRequest: true, masterPrices: [] }));
    expect(r).toEqual({ sellable: true, onRequest: true });
  });

  it("still withholds a price-on-request option that is deactivated", () => {
    expect(evaluateCustomization(input({ priceOnRequest: true, active: false })).sellable).toBe(false);
  });

  it("maps flat units to a per-booking charge", () => {
    for (const unit of ["fixed", "per_group"] as const) {
      const r = evaluateCustomization(input({ masterPrices: [price({ unit })] }));
      expect(r).toMatchObject({ sellable: true, chargeBasis: "per_booking" });
    }
  });

  it("allows a zero price (an included base option)", () => {
    const r = evaluateCustomization(input({ masterPrices: [price({ amountMinor: 0 })] }));
    expect(r).toMatchObject({ sellable: true, priceMinor: 0 });
  });
});

describe("customizationTotalMinor — integer paise arithmetic", () => {
  it("multiplies per-person options by travellers", () => {
    expect(customizationTotalMinor(150_000, "per_person", 6)).toBe(900_000);
  });

  it("charges per-booking options once regardless of group size", () => {
    expect(customizationTotalMinor(150_000, "per_booking", 6)).toBe(150_000);
  });

  it("treats nonsense traveller counts as one traveller, never zero", () => {
    expect(customizationTotalMinor(150_000, "per_person", 0)).toBe(150_000);
    expect(customizationTotalMinor(150_000, "per_person", Number.NaN)).toBe(150_000);
  });

  it("multiplies per-person-per-night by travellers and nights", () => {
    expect(customizationTotalMinor(50_000, "per_person_per_night", 4, { nights: 3 })).toBe(600_000);
  });

  it("counts whole rooms for room-based bases", () => {
    // 5 travellers in quad rooms = 2 rooms; 2 nights.
    expect(chargeQuantity("per_room_per_night", { travellers: 5, nights: 2, roomOccupancy: 4 })).toBe(4);
    expect(chargeQuantity("per_room", { travellers: 4, roomOccupancy: 2 })).toBe(2);
    expect(chargeQuantity("per_room", { travellers: 1, roomOccupancy: 2 })).toBe(1);
  });

  it("charges per-night bases by nights only", () => {
    expect(chargeQuantity("per_night", { travellers: 6, nights: 4 })).toBe(4);
  });

  it("reproduces the brief's worked example (4 travellers)", () => {
    const base = 599_900 * 4;
    const hotel = customizationTotalMinor(150_000, "per_person", 4);
    const travel = customizationTotalMinor(300_000, "per_booking", 4);
    expect(base + hotel + travel).toBe(3_299_600);
  });
});

describe("marginMinor — admin-only economics", () => {
  it("is selling price minus supplier cost", () => {
    expect(marginMinor(250_000, 180_000)).toBe(70_000);
  });
  it("is unknown when either side is missing", () => {
    expect(marginMinor(250_000, null)).toBeNull();
    expect(marginMinor(null, 1)).toBeNull();
  });
});
