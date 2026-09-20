import { Cl } from "@stacks/transactions";
import type { TokenCategory } from "@rwaforge/types";
import { getMarketContractId } from "./config";
import type { ContractCallRequest } from "./wallet";

export function buildCreateTokenTx(params: {
  name: string;
  symbol: string;
  description: string;
  category: TokenCategory | string;
  totalSupply: bigint | number;
  priceMicroStx: bigint | number;
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
    ],
  };
}

export function buildPurchaseTx(params: {
  tokenId: number;
  amount: bigint | number;
}): ContractCallRequest {
  return {
    contract: getMarketContractId(),
    functionName: "purchase",
    functionArgs: [Cl.uint(params.tokenId), Cl.uint(params.amount)],
  };
}
