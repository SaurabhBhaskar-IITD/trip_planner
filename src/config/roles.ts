/**
 * Roles & permissions matrix.
 *
 * Authorization is permission-based, not role-based, at the point of enforcement:
 * code checks `can(user, "quote:create")`, never `if (user.role === "sales")`.
 * Roles are simply named bundles of permissions, which makes adding a new role a
 * data change here rather than a code change scattered across the app.
 */

export const ROLES = ["admin", "manager", "sales", "operations"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Fine-grained permissions. Grouped by domain area. Add new permissions here and
 * grant them to roles in ROLE_PERMISSIONS below.
 *
 * `pricing:viewInternal` is deliberately isolated: it gates supplier cost, markup
 * and margin — information that must never reach public/customer surfaces.
 */
export const PERMISSIONS = [
  // Trips & master data
  "trip:read",
  "trip:write",
  "destination:read",
  "destination:write",
  "accommodation:read",
  "accommodation:write",
  "transport:read",
  "transport:write",
  "activity:read",
  "activity:write",
  "meal:read",
  "meal:write",
  "addon:read",
  "addon:write",
  // Pricing (managePricing = pricing:write, gates ALL master-price edits)
  "pricing:read",
  "pricing:write",
  "pricing:viewInternal", // supplier cost, margin — INTERNAL ONLY
  // Quotes & customers
  "quote:read",
  "quote:create",
  "quote:write",
  "quote:approveDiscount",
  "customer:read",
  "customer:write",
  // Administration
  "user:read",
  "user:write",
  "settings:read",
  "settings:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS;

/**
 * The authoritative role → permission mapping.
 * Kept explicit (rather than clever set arithmetic) so it can be audited at a glance.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ALL_PERMISSIONS,
  manager: [
    "trip:read",
    "trip:write",
    "destination:read",
    "destination:write",
    "accommodation:read",
    "accommodation:write",
    "transport:read",
    "transport:write",
    "activity:read",
    "activity:write",
    "meal:read",
    "meal:write",
    "addon:read",
    "addon:write",
    "pricing:read",
    "pricing:write",
    "pricing:viewInternal",
    "quote:read",
    "quote:create",
    "quote:write",
    "quote:approveDiscount",
    "customer:read",
    "customer:write",
    "settings:read",
  ],
  sales: [
    "trip:read",
    "destination:read",
    "accommodation:read",
    "transport:read",
    "activity:read",
    "meal:read",
    "addon:read",
    "pricing:read",
    "quote:read",
    "quote:create",
    "quote:write",
    "customer:read",
    "customer:write",
  ],
  operations: [
    "trip:read",
    "trip:write",
    "destination:read",
    "destination:write",
    "accommodation:read",
    "accommodation:write",
    "transport:read",
    "transport:write",
    "activity:read",
    "activity:write",
    "meal:read",
    "meal:write",
    "addon:read",
    "addon:write",
    "pricing:read",
    "quote:read",
    "customer:read",
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  manager: "Manager",
  sales: "Sales",
  operations: "Operations",
};

/** Pure permission check — safe to use on both server and client. */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
