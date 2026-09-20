import { describe, expect, it } from "vitest";
import { acceptedAssets, ASSET_DECIMALS, baseUnitsToNumber, priceIn } from "./payment";

const stxOnly = { priceMicroStx: "1000000", priceSats: "0" };
const sbtcOnly = { priceMicroStx: "0", priceSats: "1000" };
const both = { priceMicroStx: "1000000", priceSats: "1000" };

describe("acceptedAssets", () => {
  it("lists only STX for an STX-priced token", () => {
    expect(acceptedAssets(stxOnly)).toEqual(["STX"]);
  });

  it("lists only sBTC for an sBTC-priced token", () => {
    expect(acceptedAssets(sbtcOnly)).toEqual(["sBTC"]);
  });

  it("lists STX first when both are accepted", () => {
    expect(acceptedAssets(both)).toEqual(["STX", "sBTC"]);
  });
});

describe("priceIn", () => {
  it("returns the price in the requested asset's base unit", () => {
    expect(priceIn(both, "STX")).toBe(1_000_000n);
    expect(priceIn(both, "sBTC")).toBe(1_000n);
  });

  it("returns zero for an asset the token does not accept", () => {
    expect(priceIn(stxOnly, "sBTC")).toBe(0n);
  });
});

describe("baseUnitsToNumber", () => {
  it("scales micro-STX by 6 decimals", () => {
    expect(baseUnitsToNumber(2_500_000, "STX")).toBe(2.5);
  });

  it("scales sats by 8 decimals", () => {
    expect(baseUnitsToNumber(150_000, "sBTC")).toBe(0.0015);
  });

  it("uses the same decimals as ASSET_DECIMALS", () => {
    expect(ASSET_DECIMALS).toEqual({ STX: 6, sBTC: 8 });
  });
});
