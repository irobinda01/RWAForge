import { Cl, Pc } from "@stacks/transactions";
import type { PaymentAsset, TokenCategory } from "@rwaforge/types";
import { getMarketContractId, getSbtcContractId } from "./config";
import type { ContractCallRequest } from "./wallet";

export function buildCreateTokenTx(params: {
  name: string;
  symbol: string;
  description: string;
  category: TokenCategory | string;
  totalSupply: bigint | number;
  /** Price per token in micro-STX. 0 = STX not accepted. */
  priceMicroStx: bigint | number;
  /** Price per token in sats (1e-8 sBTC). 0 = sBTC not accepted. */
  priceSats: bigint | number;
}): ContractCallRequest {
  return {
    contract: getMarketContractId(),
    functionName: "create-token",
    functionArgs: [
      Cl.stringAscii(params.name),
      Cl.stringAscii(params.symbol),
      Cl.stringUtf8(params.description),
      Cl.stringAscii(params.category),
      Cl.uint(params.totalSupply),
      Cl.uint(params.priceMicroStx),
      Cl.uint(params.priceSats),
    ],
  };
}

/**
 * `cost` is the total in the asset's base unit (micro-STX or sats). It is
 * baked into a wallet post-condition so the wallet shows the exact amount
 * leaving the buyer's account and aborts the transaction if the contract
 * ever tried to move more than that (or anything else).
 */
export function buildPurchaseTx(params: {
  tokenId: number;
  amount: bigint | number;
  asset: PaymentAsset;
  buyer: string;
  cost: bigint;
}): ContractCallRequest {
  const sender = Pc.principal(params.buyer);
  const payment =
    params.asset === "STX"
      ? sender.willSendEq(params.cost).ustx()
      : sender.willSendEq(params.cost).ft(getSbtcContractId() as `${string}.${string}`, "sbtc-token");

  return {
    contract: getMarketContractId(),
    functionName: params.asset === "STX" ? "purchase" : "purchase-with-sbtc",
    functionArgs: [Cl.uint(params.tokenId), Cl.uint(params.amount)],
    postConditions: [payment],
    postConditionMode: "deny",
  };
}
