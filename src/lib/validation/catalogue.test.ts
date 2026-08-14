import { describe, it, expect } from "vitest";
import { accommodationInputSchema, roomTypeInputSchema } from "./accommodation.schema";
import { transportationInputSchema } from "./transportation.schema";
import { activityInputSchema } from "./activity.schema";
import { mealInputSchema } from "./meal.schema";
import { addonInputSchema } from "./addon.schema";

describe("accommodation validation", () => {
  it("requires a destination and a valid category", () => {
    expect(
      accommodationInputSchema.safeParse({ name: "Snow Valley", category: "deluxe" }).success,
    ).toBe(false); // missing destinationId
    expect(
      accommodationInputSchema.safeParse({
        name: "Snow Valley",
        destinationId: "d1",
        category: "castle",
      }).success,
    ).toBe(false); // invalid category
  });

  it("normalises comma-separated amenities into a clean array", () => {
    const res = accommodationInputSchema.safeParse({
      name: "Snow Valley",
      destinationId: "d1",
      category: "deluxe",
      amenities: "WiFi, , Parking ,Restaurant",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.amenities).toEqual(["WiFi", "Parking", "Restaurant"]);
  });
});

describe("room type validation", () => {
  it("accepts a valid room type from the occupancy enum", () => {
    const res = roomTypeInputSchema.safeParse({
      name: "Deluxe Room",
      occupancy: "double",
      category: "deluxe",
    });
    expect(res.success).toBe(true);
  });

  it("rejects an occupancy outside the enum", () => {
    expect(
      roomTypeInputSchema.safeParse({ name: "R", occupancy: "octuple", category: "deluxe" }).success,
    ).toBe(false);
  });

  it("rejects a max occupancy below the base capacity", () => {
    // "triple" has base capacity 3; capping at 2 is invalid.
    const res = roomTypeInputSchema.safeParse({
      name: "Standard",
      occupancy: "triple",
      category: "standard",
      maxOccupancy: 2,
    });
    expect(res.success).toBe(false);
  });
});

describe("transportation validation", () => {
  it("requires a capacity of at least 1", () => {
    expect(
      transportationInputSchema.safeParse({ name: "Bus", mode: "bus", capacity: 0 }).success,
    ).toBe(false);
  });

  it("accepts a valid vehicle with structured capacity", () => {
    const res = transportationInputSchema.safeParse({
      name: "Tempo",
      mode: "tempo_traveller",
      capacity: 12,
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.capacity).toBe(12);
  });

  it("rejects an unknown transport mode", () => {
    expect(
      transportationInputSchema.safeParse({ name: "Rocket", mode: "rocket", capacity: 2 }).success,
    ).toBe(false);
  });
});

describe("activity validation", () => {
  it("allows an optional destination", () => {
    const res = activityInputSchema.safeParse({ name: "Paragliding", type: "adventure" });
    expect(res.success).toBe(true);
  });

  it("rejects an unknown activity type", () => {
    expect(activityInputSchema.safeParse({ name: "X", type: "teleportation" }).success).toBe(false);
  });
});

describe("meal validation", () => {
  it("accepts the standard plans/types", () => {
    expect(mealInputSchema.safeParse({ name: "MAP", mealType: "dinner", plan: "MAP" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown meal plan", () => {
    expect(
      mealInputSchema.safeParse({ name: "X", mealType: "dinner", plan: "brunch" }).success,
    ).toBe(false);
  });
});

describe("addon validation", () => {
  it("requires a name of at least 2 characters", () => {
    expect(addonInputSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(addonInputSchema.safeParse({ name: "Airport Transfer" }).success).toBe(true);
  });
});
