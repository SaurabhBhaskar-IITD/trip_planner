import { describe, it, expect } from "vitest";
import { destinationInputSchema, parseDestinationForm } from "./destination.schema";
import { parseTripForm } from "./trip.schema";
import { parseItinerarySegmentForm } from "./itinerary.schema";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("destination validation", () => {
  it("rejects a too-short name", () => {
    const res = destinationInputSchema.safeParse({ name: "A" });
    expect(res.success).toBe(false);
  });

  it("defaults country and active", () => {
    const res = destinationInputSchema.safeParse({ name: "Manali" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.country).toBe("India");
      expect(res.data.active).toBe(true);
    }
  });

  it("rejects an invalid slug", () => {
    const res = destinationInputSchema.safeParse({ name: "Manali", slug: "Not A Slug" });
    expect(res.success).toBe(false);
  });

  it("parses FormData with the active switch", () => {
    const res = parseDestinationForm(fd({ name: "Kasol", active: "on" }));
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.active).toBe(true);

    const off = parseDestinationForm(fd({ name: "Kasol" }));
    expect(off.success).toBe(true);
    if (off.success) expect(off.data.active).toBe(false);
  });
});

describe("trip validation", () => {
  it("preserves ordered destination ids from the comma-separated field", () => {
    const res = parseTripForm(
      fd({
        name: "Himachal Explorer",
        durationDays: "7",
        durationNights: "6",
        destinationIds: "a,b,c",
      }),
    );
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.destinationIds).toEqual(["a", "b", "c"]);
  });

  it("requires at least one day", () => {
    const res = parseTripForm(fd({ name: "Zero Trip", durationDays: "0", durationNights: "0" }));
    expect(res.success).toBe(false);
  });

  it("coerces numeric duration from strings", () => {
    const res = parseTripForm(fd({ name: "Coerce Trip", durationDays: "5", durationNights: "4" }));
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.durationDays).toBe(5);
      expect(res.data.durationNights).toBe(4);
    }
  });
});

describe("itinerary segment validation", () => {
  it("accepts a valid transfer segment with transport mode", () => {
    const res = parseItinerarySegmentForm(
      fd({ type: "transfer", title: "Delhi to Shimla", transportMode: "private_sedan" }),
    );
    expect(res.success).toBe(true);
  });

  it("rejects an unknown segment type", () => {
    const res = parseItinerarySegmentForm(fd({ type: "teleport", title: "Warp" }));
    expect(res.success).toBe(false);
  });
});
