import type { Money } from "@/domain/shared/money";
import type { ComponentKind, PricingUnit } from "@/domain/shared/enums";
import type { PricingRule } from "@/domain/entities/pricing-rule";

/**
 * Pricing engine contracts.
 *
 * The engine is a PURE FUNCTION of its input. It performs no I/O, reads no clock
 * and uses no randomness — the travel date, traveller count and every price are
 * supplied by the caller. Identical input always yields identical output. This
 * determinism is the reason AI is never allowed in this path.
 */

/** One resolved, priced component ready for the engine (a "snapshot input"). */
export interface ResolvedLineInput {
  sourceId?: string;
  kind: ComponentKind;
  label: string;
  unit: PricingUnit;
  /** Customer-facing unit price. */
  unitPrice: Money;
  quantity: number;
  /** INTERNAL: supplier cost for the same unit (optional). */
  supplierUnitCost?: Money;
}

/** Contextual facts the rule evaluator needs. No live DB handles here. */
export interface PricingContext {
  travelStartDate: Date;
  travelEndDate: Date;
  nights: number;
  travellerCount: number;
  /** Pre-resolved base components (accommodation, transport, activities, …). */
  baseInputs: ResolvedLineInput[];
  /** Declarative rules to evaluate against the context. */
  rules: PricingRule[];
  /** Rule ids the operator has explicitly approved (for gated effects). */
  approvedRuleIds: string[];
}

/** A single line in the final breakdown. */
export interface PriceLine {
  sourceId?: string;
  kind: ComponentKind;
  label: string;
  unit: PricingUnit;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  internal?: {
    supplierCostMinor: number;
    marginMinor: number;
    marginPercentage: number;
  };
}

export interface PriceAdjustment {
  kind: "discount" | "tax" | "surcharge";
  label: string;
  amountMinor: number; // positive magnitude; sign applied by kind
  ruleId?: string;
}

/** The complete, deterministic pricing result. */
export interface PriceBreakdown {
  currency: "INR";
  lines: PriceLine[];
  adjustments: PriceAdjustment[];
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  grandTotalMinor: number;
  /** INTERNAL-ONLY commercial summary — stripped by public serialisers. */
  internal?: {
    supplierCostTotalMinor: number;
    marginTotalMinor: number;
    marginPercentage: number;
  };
  engineVersion: string;
}

/**
 * Contract for the declarative rule evaluator implemented in Phase 3.
 * It transforms context + base inputs into additional lines and adjustments.
 * Phase 1 ships a no-op implementation so the engine composes end-to-end.
 */
export interface RuleEvaluator {
  evaluate(context: PricingContext): {
    additionalLines: ResolvedLineInput[];
    adjustments: PriceAdjustment[];
  };
}
