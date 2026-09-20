import type { MarketToken } from "@rwaforge/types";
import { acceptedAssets, ASSET_DECIMALS, priceIn } from "@/lib/payment";
import { formatTokenAmount } from "@/lib/format";

/** One line per accepted payment asset, e.g. "1 STX" / "0.00001 sBTC". */
export function TokenPrices({ token }: { token: MarketToken }) {
  return (
    <>
      {acceptedAssets(token).map((asset) => (
        <span key={asset} className="block">
          {formatTokenAmount(priceIn(token, asset), ASSET_DECIMALS[asset])} {asset}
        </span>
      ))}
    </>
  );
}
