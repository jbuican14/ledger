import { describe, it, expect } from "vitest";
import { getCurrencySymbol, formatCompactCurrency } from "./currency";

describe("getCurrencySymbol", () => {
  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("returns $ for USD", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR")).toBe("€");
  });

  it("returns ¥ for JPY", () => {
    expect(getCurrencySymbol("JPY")).toBe("¥");
  });

  it("returns the code itself for invalid input", () => {
    expect(getCurrencySymbol("NOT_A_CODE")).toBe("NOT_A_CODE");
  });
});

describe("formatCompactCurrency", () => {
  it("formats sub-1000 amounts with no suffix", () => {
    expect(formatCompactCurrency(0, "GBP")).toBe("£0");
    expect(formatCompactCurrency(50, "GBP")).toBe("£50");
    expect(formatCompactCurrency(999, "GBP")).toBe("£999");
  });

  it("rounds sub-1000 amounts to the nearest integer", () => {
    expect(formatCompactCurrency(49.6, "GBP")).toBe("£50");
    expect(formatCompactCurrency(49.4, "GBP")).toBe("£49");
  });

  it("uses k suffix for thousands", () => {
    expect(formatCompactCurrency(1000, "GBP")).toBe("£1k");
    expect(formatCompactCurrency(1234, "GBP")).toBe("£1.2k");
    expect(formatCompactCurrency(12_345, "GBP")).toBe("£12.3k");
    expect(formatCompactCurrency(999_499, "GBP")).toBe("£999.5k");
  });

  it("uses m suffix for millions", () => {
    expect(formatCompactCurrency(1_000_000, "GBP")).toBe("£1m");
    expect(formatCompactCurrency(1_234_567, "GBP")).toBe("£1.2m");
  });

  it("respects the currency argument", () => {
    expect(formatCompactCurrency(1234, "EUR")).toBe("€1.2k");
    expect(formatCompactCurrency(1234, "USD")).toBe("$1.2k");
  });

  it("handles negative amounts as their absolute compact value", () => {
    // Totals coming into this helper are already absolute, but be defensive.
    expect(formatCompactCurrency(-1234, "GBP")).toBe("£1.2k");
  });
});
