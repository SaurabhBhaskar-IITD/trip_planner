import { describe, it, expect } from "vitest";
import { allocateRooms, allocateVehicles } from "./allocation";

describe("allocateRooms (§8)", () => {
  it("divides evenly", () => {
    expect(allocateRooms(6, "double")).toBe(3);
    expect(allocateRooms(12, "double")).toBe(6);
  });
  it("rounds up on remainder", () => {
    expect(allocateRooms(7, "double")).toBe(4); // ceil(7/2)
    expect(allocateRooms(7, "triple")).toBe(3); // ceil(7/3)
    expect(allocateRooms(5, "quad")).toBe(2);
  });
  it("uses the occupancy capacity", () => {
    expect(allocateRooms(6, "single")).toBe(6);
    expect(allocateRooms(6, "six_sharing")).toBe(1);
    expect(allocateRooms(7, "six_sharing")).toBe(2);
  });
  it("returns 0 for no travellers", () => {
    expect(allocateRooms(0, "double")).toBe(0);
  });
});

describe("allocateVehicles (§10)", () => {
  it("uses the configured capacity", () => {
    expect(allocateVehicles(8, 12)).toBe(1);
    expect(allocateVehicles(12, 12)).toBe(1);
    expect(allocateVehicles(13, 12)).toBe(2); // §38 CASE 5
    expect(allocateVehicles(16, 12)).toBe(2);
    expect(allocateVehicles(25, 12)).toBe(3);
  });
  it("returns 0 for invalid capacity (caller treats as error)", () => {
    expect(allocateVehicles(4, 0)).toBe(0);
    expect(allocateVehicles(4, -1)).toBe(0);
  });
});
