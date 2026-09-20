import { describe, expect, it } from "vitest";
import { formatTokenAmount, toBaseUnits, formatBlockHeight } from "./format";

describe("formatTokenAmount", () => {
  it("formats a whole-number amount with no fraction", () => {
    expect(formatTokenAmount("100000000", 6)).toBe("100");
  });

  it("formats an amount with a fractional part, trimming trailing zeros", () => {
    expect(formatTokenAmount("100500000", 6)).toBe("100.5");
  });

  it("adds thousands separators to the whole part", () => {
    expect(formatTokenAmount("1234567000000", 6)).toBe("1,234,567");
  });

  it("handles zero decimals", () => {
    expect(formatTokenAmount("42", 0)).toBe("42");
  });

  it("handles a bigint input directly", () => {
    expect(formatTokenAmount(5_000_000n, 6)).toBe("5");
  });

  it("handles zero amount", () => {
    expect(formatTokenAmount("0", 6)).toBe("0");
  });
});

describe("toBaseUnits", () => {
  it("converts a whole number to base units", () => {
    expect(toBaseUnits("100", 6)).toBe(100_000_000n);
  });

  it("converts a decimal amount to base units", () => {
    expect(toBaseUnits("100.5", 6)).toBe(100_500_000n);
  });

  it("truncates excess decimal precision instead of rounding", () => {
    expect(toBaseUnits("1.1234567", 6)).toBe(1_123_456n);
  });

  it("round-trips through formatTokenAmount", () => {
    const base = toBaseUnits("42.5", 6);
    expect(formatTokenAmount(base, 6)).toBe("42.5");
  });

  it("handles an empty fractional part", () => {
    expect(toBaseUnits("7", 6)).toBe(7_000_000n);
  });
});

describe("formatBlockHeight", () => {
  it("formats a block height with a leading # and thousands separators", () => {
    expect(formatBlockHeight(123456)).toBe("#123,456");
  });

  it("renders an em dash for null", () => {
    expect(formatBlockHeight(null)).toBe("—");
  });
});
