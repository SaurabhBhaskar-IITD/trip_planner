import { describe, it, expect } from "vitest";
import { roleHasPermission } from "./roles";

/**
 * Guards the catalogue/pricing permission matrix for the new modules. The point
 * is enforcement of least privilege: sales can read master data but not edit it or
 * see internal commercials; operations manages catalogue but cannot set prices.
 */
describe("catalogue permission matrix", () => {
  it("admin & manager can edit every master-data module", () => {
    for (const perm of [
      "accommodation:write",
      "transport:write",
      "activity:write",
      "meal:write",
      "addon:write",
      "pricing:write",
    ] as const) {
      expect(roleHasPermission("admin", perm)).toBe(true);
      expect(roleHasPermission("manager", perm)).toBe(true);
    }
  });

  it("sales is read-only on master data and cannot write pricing", () => {
    expect(roleHasPermission("sales", "accommodation:read")).toBe(true);
    expect(roleHasPermission("sales", "accommodation:write")).toBe(false);
    expect(roleHasPermission("sales", "pricing:read")).toBe(true);
    expect(roleHasPermission("sales", "pricing:write")).toBe(false);
  });

  it("only admin & manager may view internal commercials (supplier cost / margin)", () => {
    expect(roleHasPermission("admin", "pricing:viewInternal")).toBe(true);
    expect(roleHasPermission("manager", "pricing:viewInternal")).toBe(true);
    expect(roleHasPermission("sales", "pricing:viewInternal")).toBe(false);
    expect(roleHasPermission("operations", "pricing:viewInternal")).toBe(false);
  });

  it("operations manages catalogue but cannot set prices", () => {
    expect(roleHasPermission("operations", "accommodation:write")).toBe(true);
    expect(roleHasPermission("operations", "pricing:write")).toBe(false);
  });
});
