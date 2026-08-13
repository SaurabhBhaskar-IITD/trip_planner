/**
 * Presentation helpers. These format already-computed values for display only;
 * they must never be used to *perform* money arithmetic (see domain/shared/money).
 */

/** Format integer minor units (paise) as an INR string, e.g. 350000 -> "₹3,500.00". */
export function formatMinorAsINR(minorUnits: number, options?: { withDecimals?: boolean }): string {
  const withDecimals = options?.withDecimals ?? false;
  const rupees = minorUnits / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(rupees);
}

export function formatDate(date: Date | string, locale = "en-IN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale = "en-IN"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** "TL-2026-000123" style human reference from a numeric sequence. */
export function formatQuoteReference(sequence: number, year = new Date().getFullYear()): string {
  return `TL-${year}-${String(sequence).padStart(6, "0")}`;
}
