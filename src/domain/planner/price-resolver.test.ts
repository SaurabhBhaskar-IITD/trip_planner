import { describe, it, expect } from "vitest";
import type { PriceDTO } from "@/types/master-data";
import { resolvePrice } from "./price-resolver";

function price(over: Partial<PriceDTO> & { id: string }): PriceDTO {
  return {
    amountMinor: 100000,
    currency: "INR",
    unit: "per_room_per_night",
    season: null,
    validFrom: null,
    validUntil: null,
    minPax: null,
    maxPax: null,
    active: true,
    ...over,
  };
}

describe("resolvePrice", () => {
  it("is 'none' when there are no prices", () => {
    expect(resolvePrice([]).status).toBe("none");
  });

  it("never returns an inactive price (§38 CASE 7)", () => {
    expect(resolvePrice([price({ id: "a", active: false })]).status).toBe("none");
  });

  it("prefers the generic price when no date is given", () => {
    const generic = price({ id: "gen", season: "all" });
    const seasonal = price({ id: "peak", season: "peak", validFrom: new Date("2026-12-01"), validUntil: new Date("2027-01-15") });
    const r = resolvePrice([seasonal, generic]);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.price.id).toBe("gen");
  });

  it("prefers the specific in-window price when a date is given", () => {
    const generic = price({ id: "gen", season: "all", amountMinor: 350000 });
    const peak = price({
      id: "peak",
      season: "peak",
      amountMinor: 450000,
      validFrom: new Date("2026-12-01"),
      validUntil: new Date("2027-01-15"),
    });
    const r = resolvePrice([generic, peak], { travelDate: new Date("2026-12-20") });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.price.id).toBe("peak");
  });

  it("is 'none' when a date falls outside every window", () => {
    const peak = price({
      id: "peak",
      validFrom: new Date("2026-12-01"),
      validUntil: new Date("2026-12-31"),
    });
    expect(resolvePrice([peak], { travelDate: new Date("2026-06-01") }).status).toBe("none");
  });

  it("is 'ambiguous' when two active generic prices compete (§14)", () => {
    const a = price({ id: "a", season: "all" });
    const b = price({ id: "b", season: null });
    const r = resolvePrice([a, b]);
    expect(r.status).toBe("ambiguous");
  });

  it("is 'ambiguous' when two seasonal prices are both in-window with a date", () => {
    const a = price({ id: "a", season: "peak", validFrom: new Date("2026-12-01"), validUntil: new Date("2027-01-31") });
    const b = price({ id: "b", season: "peak", validFrom: new Date("2026-12-15"), validUntil: new Date("2027-02-15") });
    const r = resolvePrice([a, b], { travelDate: new Date("2026-12-20") });
    expect(r.status).toBe("ambiguous");
  });
});
