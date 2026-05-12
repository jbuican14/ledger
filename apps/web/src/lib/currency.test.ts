import { describe, it, expect } from "vitest";
import { getCurrencySymbol } from "./currency";

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
