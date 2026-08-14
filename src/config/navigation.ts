import type { Permission } from "@/config/roles";
import {
  LayoutDashboard,
  Map,
  MapPin,
  BedDouble,
  Bus,
  Ticket,
  UtensilsCrossed,
  PackagePlus,
  Tags,
  FileText,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see & use this section (server-enforced separately). */
  permission?: Permission;
  /** Optional grouping label rendered as a section heading in the sidebar. */
  group: "Overview" | "Catalogue" | "Sales" | "Admin";
}

/**
 * Single source of truth for primary navigation. Consumed by the sidebar and by
 * route metadata. Permissions here drive UI visibility only — every route is
 * independently protected on the server.
 */
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Overview" },
  { title: "Trips", href: "/trips", icon: Map, permission: "trip:read", group: "Catalogue" },
  {
    title: "Destinations",
    href: "/destinations",
    icon: MapPin,
    permission: "destination:read",
    group: "Catalogue",
  },
  {
    title: "Accommodations",
    href: "/accommodations",
    icon: BedDouble,
    permission: "accommodation:read",
    group: "Catalogue",
  },
  {
    title: "Transport",
    href: "/transport",
    icon: Bus,
    permission: "transport:read",
    group: "Catalogue",
  },
  {
    title: "Activities",
    href: "/activities",
    icon: Ticket,
    permission: "activity:read",
    group: "Catalogue",
  },
  {
    title: "Meals",
    href: "/meals",
    icon: UtensilsCrossed,
    permission: "meal:read",
    group: "Catalogue",
  },
  {
    title: "Add-ons",
    href: "/addons",
    icon: PackagePlus,
    permission: "addon:read",
    group: "Catalogue",
  },
  {
    title: "Pricing",
    href: "/pricing",
    icon: Tags,
    permission: "pricing:read",
    group: "Catalogue",
  },
  { title: "Quotes", href: "/quotes", icon: FileText, permission: "quote:read", group: "Sales" },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    permission: "customer:read",
    group: "Sales",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    permission: "settings:read",
    group: "Admin",
  },
];

export const NAV_GROUP_ORDER: NavItem["group"][] = ["Overview", "Catalogue", "Sales", "Admin"];
