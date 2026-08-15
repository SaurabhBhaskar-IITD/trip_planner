import { describe, it, expect } from "vitest";
import type { TripDetailDTO } from "@/types/master-data";
import { generateItinerary } from "./itinerary-generator";

const now = new Date();

function trip(): TripDetailDTO {
  return {
    id: "t1",
    name: "Himachal Explorer",
    slug: "himachal-explorer",
    summary: null,
    description: null,
    durationDays: 7,
    durationNights: 6,
    status: "active",
    version: 1,
    destinations: [],
    createdAt: now,
    updatedAt: now,
    itinerary: [
      {
        id: "d1",
        dayNumber: 1,
        title: "Arrival in Shimla",
        summary: null,
        fromDestinationId: null,
        toDestinationId: null,
        fromName: "Delhi",
        toName: "Shimla",
        segments: [
          { id: "s1", sortOrder: 0, type: "transfer", title: "Delhi → Shimla", detail: null, transportMode: "bus", mealType: null },
          { id: "s2", sortOrder: 1, type: "accommodation", title: "Hotel check-in", detail: null, transportMode: null, mealType: null },
          { id: "s3", sortOrder: 2, type: "meal", title: "Dinner", detail: null, transportMode: null, mealType: "dinner" },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        title: "Shimla sightseeing",
        summary: "Explore Kufri and the Mall Road.",
        fromDestinationId: null,
        toDestinationId: null,
        fromName: null,
        toName: null,
        segments: [
          { id: "s4", sortOrder: 0, type: "sightseeing", title: "Kufri", detail: null, transportMode: null, mealType: null },
        ],
      },
    ],
  };
}

describe("generateItinerary", () => {
  it("reflects the selected transport on transfer days and accommodation on stay days (§25)", () => {
    const doc = generateItinerary({
      trip: trip(),
      customerName: "Rahul Sharma",
      travellerCount: 6,
      occupancy: "double",
      accommodationName: "Hotel Snow Valley",
      transportName: "Private Tempo Traveller",
      transportMode: "tempo_traveller",
      activityNames: ["Paragliding"],
      mealNames: ["MAP Plan"],
      addonNames: ["Airport Transfer"],
    });

    const day1 = doc.days[0]!;
    expect(day1.route).toBe("Delhi → Shimla");
    // selected transport overrides the base "bus" transfer
    expect(day1.transport).toBe("Private Tempo Traveller");
    expect(day1.accommodation).toBe("Hotel Snow Valley · Double sharing");
    expect(day1.meals).toBe("Dinner");
    // day 2 has no transfer → no transport line
    expect(doc.days[1]!.transport).toBeUndefined();
    expect(doc.days[1]!.description).toBe("Explore Kufri and the Mall Road.");
  });

  it("derives inclusions from the actual selected configuration (§27)", () => {
    const doc = generateItinerary({
      trip: trip(),
      customerName: "Rahul Sharma",
      travellerCount: 6,
      occupancy: "double",
      accommodationName: "Hotel Snow Valley",
      transportName: "Private Tempo Traveller",
      activityNames: ["Paragliding"],
      mealNames: ["MAP Plan"],
      addonNames: ["Airport Transfer"],
    });
    expect(doc.inclusions).toContain("Transport: Private Tempo Traveller");
    expect(doc.inclusions).toContain("Paragliding");
    expect(doc.inclusions).toContain("Airport Transfer");
    expect(doc.preparedFor).toBe("Rahul Sharma");
  });

  it("is deterministic", () => {
    const args = {
      trip: trip(),
      customerName: "A",
      travellerCount: 2,
      activityNames: [],
      mealNames: [],
      addonNames: [],
    };
    expect(generateItinerary(args)).toEqual(generateItinerary(args));
  });
});
