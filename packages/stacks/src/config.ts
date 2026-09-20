import type { StacksNetworkName } from "@rwaforge/types";
import { resolveNetworkName } from "./network";

/**
 * The single deployed `token-market` contract every RWAForge frontend
 * action reads from and writes to. Set once per environment; see
 * apps/web/.env.example.
 */
export function getMarketContractId(): string {
  const id = process.env.NEXT_PUBLIC_MARKET_CONTRACT_ID;
  if (!id) {
    throw new Error("NEXT_PUBLIC_MARKET_CONTRACT_ID is not set. See apps/web/.env.example.");
  }
  return id;
}

/**
 * The sBTC token contract `token-market` pays out of. This must match the
 * contract literal hardcoded in `purchase-with-sbtc` (Clarity resolves
 * contract-call? targets statically), so it is fixed per network here
 * rather than configured through an env var.
 */
export function getSbtcContractId(network: StacksNetworkName = resolveNetworkName()): string {
  return network === "mainnet"
    ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
    : "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token";
}

export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, name] = contractId.split(".");
  if (!address || !name) {
    throw new Error(`Invalid contract id: ${contractId}`);
  }
  return { address, name };
}
