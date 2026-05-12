/**
 * Returns the localized currency symbol for an ISO 4217 currency code.
 * Uses Intl.NumberFormat so non-ASCII symbols (£, €, ¥) come out correctly
 * in any browser without a hardcoded map.
 *
 * Falls back to the code itself if extraction fails (e.g. unknown code).
 */
/**
 * Compact currency formatting for peripheral UI (e.g. small labels under
 * navigator pills). Targets <8 visual characters so it fits in tight spaces.
 *
 *   0      → "£0"
 *   50     → "£50"
 *   1000   → "£1k"
 *   1234   → "£1.2k"
 *   1234567 → "£1.2m"
 *
 * Uses a custom suffix table rather than Intl's `notation: "compact"` to keep
 * the suffix lowercase (matches the design spec) and to drop trailing ".0".
 */
export function formatCompactCurrency(
  amount: number,
  currency: string,
): string {
  const symbol = getCurrencySymbol(currency);
  const abs = Math.abs(amount);

  if (abs >= 1_000_000) {
    return `${symbol}${trimZero((abs / 1_000_000).toFixed(1))}m`;
  }
  if (abs >= 1_000) {
    return `${symbol}${trimZero((abs / 1_000).toFixed(1))}k`;
  }
  return `${symbol}${Math.round(abs)}`;
}

function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const symbol = parts.find((p) => p.type === "currency")?.value;
    return symbol ?? currency;
  } catch {
    return currency;
  }
}
