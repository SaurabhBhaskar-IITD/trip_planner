import { describe, it, expect } from "vitest";
import { pricingInputSchema, toPriceWriteInput } from "./pricing.schema";

const valid = {
  amountMajor: 3500,
  unit: "per_room_per_night" as const,
  active: true,
};

describe("pricingInputSchema", () => {
  it("accepts a valid price", () => {
    expect(pricingInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a zero or negative price", () => {
    expect(pricingInputSchema.safeParse({ ...valid, amountMajor: 0 }).success).toBe(false);
    expect(pricingInputSchema.safeParse({ ...valid, amountMajor: -100 }).success).toBe(false);
  });

  it("rejects an inverted validity range", () => {
    const res = pricingInputSchema.safeParse({
      ...valid,
      validFrom: "2027-01-15",
      validUntil: "2026-12-01",
    });
    expect(res.success).toBe(false);
  });

  it("accepts an equal from/until date", () => {
    const res = pricingInputSchema.safeParse({
      ...valid,
      validFrom: "2026-12-01",
      validUntil: "2026-12-01",
    });
    expect(res.success).toBe(true);
  });

  it("rejects max pax below min pax", () => {
    expect(pricingInputSchema.safeParse({ ...valid, minPax: 4, maxPax: 2 }).success).toBe(false);
  });

  it("rejects an unknown pricing unit", () => {
    expect(pricingInputSchema.safeParse({ ...valid, unit: "per_lightyear" }).success).toBe(false);
  });
});

describe("toPriceWriteInput", () => {
  it("converts rupees to integer minor units without floating error", () => {
    const parsed = pricingInputSchema.parse({ ...valid, amountMajor: 3500.5 });
    const write = toPriceWriteInput(parsed, { canWriteInternal: true });
    expect(write.amountMinor).toBe(350050);
    expect(Number.isInteger(write.amountMinor)).toBe(true);
  });

  it("keeps supplier cost only when the caller may write internal fields", () => {
    const parsed = pricingInputSchema.parse({ ...valid, supplierCostMajor: 2500 });
    expect(toPriceWriteInput(parsed, { canWriteInternal: true }).supplierCostMinor).toBe(250000);
    expect(toPriceWriteInput(parsed, { canWriteInternal: false }).supplierCostMinor).toBeNull();
  });

  it("defaults an empty season to null", () => {
    const parsed = pricingInputSchema.parse({ ...valid, season: "" });
    expect(toPriceWriteInput(parsed, { canWriteInternal: false }).season).toBeNull();
  });
});
