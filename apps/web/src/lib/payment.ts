import type { MarketToken, PaymentAsset } from "@rwaforge/types";

/** Base-unit decimals per asset: micro-STX (6) and sats (8). */
export const ASSET_DECIMALS: Record<PaymentAsset, number> = { STX: 6, sBTC: 8 };

/** A token's price per whole token in the asset's base unit; 0n means "not accepted". */
export function priceIn(token: Pick<MarketToken, "priceMicroStx" | "priceSats">, asset: PaymentAsset): bigint {
  return BigInt(asset === "STX" ? token.priceMicroStx : token.priceSats);
}

/** Assets a token can be bought with, STX first. */
export function acceptedAssets(token: Pick<MarketToken, "priceMicroStx" | "priceSats">): PaymentAsset[] {
  return (["STX", "sBTC"] as const).filter((asset) => priceIn(token, asset) > 0n);
}

/** Formats a base-unit amount of `asset` as a decimal number (no unit). */
export function baseUnitsToNumber(baseUnits: number, asset: PaymentAsset): number {
  return baseUnits / 10 ** ASSET_DECIMALS[asset];
}
