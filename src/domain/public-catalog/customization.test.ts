import { describe, expect, it } from "vitest";
import type { PriceDTO } from "@/types/master-data";
import {
  customizationTotalMinor,
  evaluateCustomization,
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

  it("withholds allocation-dependent units the website cannot compute", () => {
    for (const unit of ["per_room", "per_room_per_night", "per_vehicle", "per_night", "percentage"] as const) {
      const r = evaluateCustomization(input({ masterPrices: [price({ unit })] }));
      expect(r.sellable, unit).toBe(false);
    }
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
});
