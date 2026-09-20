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

export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, name] = contractId.split(".");
  if (!address || !name) {
    throw new Error(`Invalid contract id: ${contractId}`);
  }
  return { address, name };
}
