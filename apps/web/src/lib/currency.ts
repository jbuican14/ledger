/**
 * Returns the localized currency symbol for an ISO 4217 currency code.
 * Uses Intl.NumberFormat so non-ASCII symbols (£, €, ¥) come out correctly
 * in any browser without a hardcoded map.
 *
 * Falls back to the code itself if extraction fails (e.g. unknown code).
 */
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
