import type { AuditInfo, EntityId, MoneyDTO } from "./common";
import type { ComponentKind } from "@/domain/shared/enums";

/**
 * Pricing rule domain model (contract only — the evaluating engine lands in a
 * later phase, see domain/pricing). A rule is declarative data so that business
 * users can eventually manage rules without code changes.
 *
 * Example rules this shape supports:
 *   - travellers >= 10            -> 5% group discount
 *   - category == "deluxe"        -> +₹2,500 per person
 *   - transport == "flight"       -> replace train component
 *   - activity == "paragliding"   -> +₹1,800 per person
 *   - mealPlan == "MAP"           -> +₹700 per person per night
 */

export type RuleConditionField =
  | "travellerCount"
  | "roomOccupancy"
  | "accommodationCategory"
  | "transportMode"
  | "activityType"
  | "mealPlan"
  | "travelMonth";

export type RuleOperator = "eq" | "neq" | "gte" | "lte" | "gt" | "lt" | "in";

export interface RuleCondition {
  field: RuleConditionField;
  operator: RuleOperator;
  value: string | number | Array<string | number>;
}

export type RuleEffectType =
  | "add_fixed" // add a flat amount
  | "add_per_person" // add amount * pax
  | "add_per_person_per_night" // amount * pax * nights
  | "discount_percentage" // reduce subtotal by percent
  | "surcharge_percentage" // increase subtotal by percent
  | "replace_component"; // swap one component kind for another

export interface RuleEffect {
  type: RuleEffectType;
  amount?: MoneyDTO;
  percent?: number;
  targetKind?: ComponentKind;
  replacementRef?: EntityId;
  label: string;
}

export interface PricingRule {
  id: EntityId;
  name: string;
  description?: string;
  /** Lower runs first; ties broken by id for determinism. */
  priority: number;
  /** ALL conditions must hold (logical AND) for the effect to apply. */
  conditions: RuleCondition[];
  effect: RuleEffect;
  /** Requires an approver permission when true (e.g. large discounts). */
  requiresApproval: boolean;
  active: boolean;
  audit: AuditInfo;
}
