import { Money } from "@/domain/shared/money";
import type {
  PriceAdjustment,
  PriceBreakdown,
  PriceLine,
  PricingContext,
  ResolvedLineInput,
  RuleEvaluator,
} from "./types";
import { noopRuleEvaluator } from "./rule-evaluator";

/**
 * Bump when the calculation semantics change. Stored on every quote version so a
 * historical quote's numbers remain reproducible and explainable.
 */
export const PRICING_ENGINE_VERSION = "1.0.0-foundation";

function toLine(input: ResolvedLineInput, includeInternal: boolean): PriceLine {
  const lineTotal = input.unitPrice.multiply(input.quantity);
  const line: PriceLine = {
    sourceId: input.sourceId,
    kind: input.kind,
    label: input.label,
    unit: input.unit,
    unitPriceMinor: input.unitPrice.minorUnits,
    quantity: input.quantity,
    lineTotalMinor: lineTotal.minorUnits,
  };

  if (includeInternal && input.supplierUnitCost) {
    const supplierCost = input.supplierUnitCost.multiply(input.quantity);
    const margin = lineTotal.subtract(supplierCost);
    line.internal = {
      supplierCostMinor: supplierCost.minorUnits,
      marginMinor: margin.minorUnits,
      marginPercentage: lineTotal.isZero()
        ? 0
        : round2((margin.minorUnits / lineTotal.minorUnits) * 100),
    };
  }
  return line;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Deterministically compute a full price breakdown from resolved inputs.
 *
 * Steps:
 *  1. Ask the rule evaluator for any extra lines / adjustments (Phase 1: none).
 *  2. Turn every resolved input into a priced line (customer + internal figures).
 *  3. Fold adjustments into discount vs tax/surcharge totals.
 *  4. Produce customer totals AND an internal margin summary.
 *
 * @param includeInternal When false, the internal commercial figures are omitted
 *   entirely — used when building customer/public-facing output.
 */
export function computePrice(
  context: PricingContext,
  options: { evaluator?: RuleEvaluator; includeInternal?: boolean } = {},
): PriceBreakdown {
  const evaluator = options.evaluator ?? noopRuleEvaluator;
  const includeInternal = options.includeInternal ?? true;

  const { additionalLines, adjustments } = evaluator.evaluate(context);

  const allInputs = [...context.baseInputs, ...additionalLines];
  const lines = allInputs.map((input) => toLine(input, includeInternal));

  const subtotal = Money.fromMinor(lines.reduce((sum, l) => sum + l.lineTotalMinor, 0));

  const discountTotal = sumAdjustments(adjustments, "discount");
  const taxTotal = sumAdjustments(adjustments, "tax").add(sumAdjustments(adjustments, "surcharge"));

  const grandTotal = subtotal.subtract(discountTotal).add(taxTotal);

  const breakdown: PriceBreakdown = {
    currency: "INR",
    lines,
    adjustments,
    subtotalMinor: subtotal.minorUnits,
    discountTotalMinor: discountTotal.minorUnits,
    taxTotalMinor: taxTotal.minorUnits,
    grandTotalMinor: grandTotal.minorUnits,
    engineVersion: PRICING_ENGINE_VERSION,
  };

  if (includeInternal) {
    const supplierCostTotal = Money.fromMinor(
      lines.reduce((sum, l) => sum + (l.internal?.supplierCostMinor ?? 0), 0),
    );
    // Margin is measured against the customer subtotal (pre-tax) less supplier cost.
    const marginTotal = subtotal.subtract(discountTotal).subtract(supplierCostTotal);
    const revenue = subtotal.subtract(discountTotal);
    breakdown.internal = {
      supplierCostTotalMinor: supplierCostTotal.minorUnits,
      marginTotalMinor: marginTotal.minorUnits,
      marginPercentage: revenue.isZero()
        ? 0
        : round2((marginTotal.minorUnits / revenue.minorUnits) * 100),
    };
  }

  return breakdown;
}

function sumAdjustments(adjustments: PriceAdjustment[], kind: PriceAdjustment["kind"]): Money {
  return Money.fromMinor(
    adjustments.filter((a) => a.kind === kind).reduce((sum, a) => sum + a.amountMinor, 0),
  );
}
