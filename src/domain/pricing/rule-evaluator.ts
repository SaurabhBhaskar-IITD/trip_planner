import type { PricingContext, RuleEvaluator, ResolvedLineInput, PriceAdjustment } from "./types";

/**
 * Phase 1 no-op rule evaluator.
 *
 * It returns no additional lines or adjustments, so the engine currently prices
 * exactly the base inputs it is given (a faithful sum-of-snapshots). The full
 * declarative evaluator — translating PricingRule conditions/effects such as
 * "travellers >= 10 -> 5% group discount" — is Phase 3. Because it implements the
 * RuleEvaluator interface, swapping it in later requires no engine changes.
 */
export class NoopRuleEvaluator implements RuleEvaluator {
  evaluate(_context: PricingContext): {
    additionalLines: ResolvedLineInput[];
    adjustments: PriceAdjustment[];
  } {
    return { additionalLines: [], adjustments: [] };
  }
}

export const noopRuleEvaluator = new NoopRuleEvaluator();
