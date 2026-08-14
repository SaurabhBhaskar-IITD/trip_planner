import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS, roleHasPermission } from "./roles";

describe("permission matrix", () => {
  it("admin holds every permission", () => {
    for (const p of PERMISSIONS) {
      expect(roleHasPermission("admin", p)).toBe(true);
    }
  });

  it("grants the new master-data view permissions to sales (read-only)", () => {
    expect(roleHasPermission("sales", "destination:read")).toBe(true);
    expect(roleHasPermission("sales", "meal:read")).toBe(true);
    expect(roleHasPermission("sales", "addon:read")).toBe(true);
  });

  it("does NOT let sales modify master data or pricing", () => {
    expect(roleHasPermission("sales", "destination:write")).toBe(false);
    expect(roleHasPermission("sales", "trip:write")).toBe(false);
    expect(roleHasPermission("sales", "pricing:write")).toBe(false);
  });

  it("lets operations manage master-data inventory", () => {
    expect(roleHasPermission("operations", "trip:write")).toBe(true);
    expect(roleHasPermission("operations", "destination:write")).toBe(true);
    expect(roleHasPermission("operations", "meal:write")).toBe(true);
  });

  it("keeps supplier-cost visibility internal to manager/admin", () => {
    expect(roleHasPermission("manager", "pricing:viewInternal")).toBe(true);
    expect(roleHasPermission("sales", "pricing:viewInternal")).toBe(false);
    expect(roleHasPermission("operations", "pricing:viewInternal")).toBe(false);
  });

  it("references only declared permissions in every role bundle", () => {
    const known = new Set<string>(PERMISSIONS);
    for (const role of ROLES) {
      for (const p of ROLE_PERMISSIONS[role]) {
        expect(known.has(p)).toBe(true);
      }
    }
  });
});
