import { describe, it, expect } from "vitest";
import {
  dateWindowsOverlap,
  findPricingConflict,
  seasonsCollide,
  type PriceValidityWindow,
} from "./validity";

const d = (s: string) => new Date(s);

describe("dateWindowsOverlap", () => {
  it("treats null bounds as open-ended (always overlaps)", () => {
    expect(dateWindowsOverlap(null, null, d("2026-01-01"), d("2026-12-31"))).toBe(true);
  });

  it("detects overlapping closed ranges", () => {
    expect(dateWindowsOverlap(d("2026-01-01"), d("2026-06-30"), d("2026-06-01"), d("2026-12-31"))).toBe(
      true,
    );
  });

  it("detects disjoint closed ranges", () => {
    expect(dateWindowsOverlap(d("2026-01-01"), d("2026-05-31"), d("2026-06-01"), d("2026-12-31"))).toBe(
      false,
    );
  });
});

describe("seasonsCollide", () => {
  it("same season collides", () => expect(seasonsCollide("peak", "peak")).toBe(true));
  it("different explicit seasons do not collide", () =>
    expect(seasonsCollide("peak", "off_peak")).toBe(false));
  it("'all' collides with anything", () => expect(seasonsCollide("all", "peak")).toBe(true));
  it("null (unscoped) collides with anything", () =>
    expect(seasonsCollide(null, "shoulder")).toBe(true));
});

describe("findPricingConflict", () => {
  const base: PriceValidityWindow = {
    unit: "per_room_per_night",
    season: "peak",
    validFrom: null,
    validUntil: null,
    active: true,
  };

  it("flags an overlapping active row with same unit + season", () => {
    const existing: PriceValidityWindow[] = [{ ...base, id: "p1" }];
    expect(findPricingConflict({ ...base }, existing)?.id).toBe("p1");
  });

  it("ignores rows with a different unit", () => {
    const existing: PriceValidityWindow[] = [{ ...base, id: "p1", unit: "per_person" }];
    expect(findPricingConflict({ ...base }, existing)).toBeNull();
  });

  it("ignores different, non-overlapping seasons", () => {
    const existing: PriceValidityWindow[] = [{ ...base, id: "p1", season: "off_peak" }];
    expect(findPricingConflict({ ...base, season: "peak" }, existing)).toBeNull();
  });

  it("never conflicts with itself (same id)", () => {
    const existing: PriceValidityWindow[] = [{ ...base, id: "p1" }];
    expect(findPricingConflict({ ...base, id: "p1" }, existing)).toBeNull();
  });

  it("an inactive candidate cannot conflict", () => {
    const existing: PriceValidityWindow[] = [{ ...base, id: "p1" }];
    expect(findPricingConflict({ ...base, active: false }, existing)).toBeNull();
  });

  it("ignores inactive existing rows", () => {
    const existing: PriceValidityWindow[] = [{ ...base, id: "p1", active: false }];
    expect(findPricingConflict({ ...base }, existing)).toBeNull();
  });

  it("allows non-overlapping date windows for the same unit/season", () => {
    const existing: PriceValidityWindow[] = [
      { ...base, id: "p1", validFrom: d("2026-01-01"), validUntil: d("2026-03-31") },
    ];
    const candidate = { ...base, validFrom: d("2026-04-01"), validUntil: d("2026-06-30") };
    expect(findPricingConflict(candidate, existing)).toBeNull();
  });
});
