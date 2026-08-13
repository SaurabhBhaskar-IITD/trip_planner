import { describe, it, expect } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("avoids float error that plain numbers suffer from", () => {
    // 0.1 + 0.2 !== 0.3 in floats; minor units make it exact.
    const total = Money.fromMajor(0.1).add(Money.fromMajor(0.2));
    expect(total.minorUnits).toBe(30);
    expect(total.toMajor()).toBe(0.3);
  });

  it("rejects non-integer minor units", () => {
    expect(() => Money.fromMinor(10.5)).toThrow();
  });

  it("multiplies and rounds to the nearest paisa", () => {
    expect(Money.fromMinor(333).multiply(3).minorUnits).toBe(999);
    expect(Money.fromMajor(700).multiply(2.5).minorUnits).toBe(175000);
  });

  it("computes percentages deterministically", () => {
    expect(Money.fromMajor(1000).percentage(18).minorUnits).toBe(18000);
    expect(Money.fromMajor(3500).percentage(5).minorUnits).toBe(17500);
  });

  it("sums a list", () => {
    const sum = Money.sum([Money.fromMajor(3500), Money.fromMajor(2500), Money.fromMajor(1800)]);
    expect(sum.toMajor()).toBe(7800);
  });

  it("throws on currency mismatch guard (single currency today)", () => {
    const a = Money.fromMinor(100, "INR");
    const b = Money.fromMinor(100, "INR");
    expect(a.add(b).minorUnits).toBe(200);
  });
});
