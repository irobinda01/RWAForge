import { Cl, cvToJSON, fetchCallReadOnlyFunction } from "@stacks/transactions";
import type { MarketToken, StacksNetworkName } from "@rwaforge/types";
import { getMarketContractId, getSbtcContractId, parseContractId } from "./config";
import { getHiroApiUrl, getStacksNetworkObject, resolveNetworkName } from "./network";
import {
  fBigUint,
  fPrincipal,
  fString,
  fUint,
  tupleFields,
  unwrapOptional,
  type CVJson,
} from "./cv";

async function callReadOnly(params: {
  functionName: string;
  functionArgs: unknown[];
  senderAddress: string;
  network?: StacksNetworkName;
}): Promise<CVJson> {
  const { address, name } = parseContractId(getMarketContractId());
  const cv = await fetchCallReadOnlyFunction({
    contractAddress: address,
    contractName: name,
    functionName: params.functionName,
    functionArgs: params.functionArgs as never,
    senderAddress: params.senderAddress,
    network: getStacksNetworkObject(params.network),
  });
  return cvToJSON(cv) as CVJson;
}

function toMarketToken(tokenId: number, tuple: CVJson, network: StacksNetworkName): MarketToken {
  const f = tupleFields(tuple);
  return {
    id: tokenId,
    creator: fPrincipal(f, "creator"),
    name: fString(f, "name"),
    symbol: fString(f, "symbol"),
    description: fString(f, "description"),
    category: fString(f, "category"),
    totalSupply: fBigUint(f, "total-supply").toString(),
    availableSupply: fBigUint(f, "available-supply").toString(),
    priceMicroStx: fBigUint(f, "price-stx").toString(),
    priceSats: fBigUint(f, "price-sbtc").toString(),
    createdAtBlock: fUint(f, "created-at"),
    network,
  };
}

export async function getMarketTokenCount(
  network: StacksNetworkName = resolveNetworkName(),
): Promise<number> {
  const { address } = parseContractId(getMarketContractId());
  const json = await callReadOnly({
    functionName: "get-token-count",
    functionArgs: [],
    senderAddress: address,
    network,
  });
  return Number(json.value);
}

export async function getMarketToken(
  tokenId: number,
  network: StacksNetworkName = resolveNetworkName(),
): Promise<MarketToken | null> {
  const { address } = parseContractId(getMarketContractId());
  const json = await callReadOnly({
    functionName: "get-token",
    functionArgs: [Cl.uint(tokenId)],
    senderAddress: address,
    network,
  });
  const some = unwrapOptional(json);
  if (!some) return null;
  return toMarketToken(tokenId, some, network);
}

/** Fetches every token in the registry, most recently created first. */
export async function getAllMarketTokens(
  network: StacksNetworkName = resolveNetworkName(),
): Promise<MarketToken[]> {
  const count = await getMarketTokenCount(network);
  const ids = Array.from({ length: count }, (_, i) => i);
  const tokens = await Promise.all(ids.map((id) => getMarketToken(id, network)));
  return tokens
    .filter((t): t is MarketToken => t !== null)
    .sort((a, b) => b.id - a.id);
}

export async function getMarketBalance(
  tokenId: number,
  owner: string,
  network: StacksNetworkName = resolveNetworkName(),
): Promise<bigint> {
  const json = await callReadOnly({
    functionName: "get-balance",
    functionArgs: [Cl.uint(tokenId), Cl.principal(owner)],
    senderAddress: owner,
    network,
  });
  return BigInt((json.value as string) ?? "0");
}

/** Confirmed STX balance (in micro-STX) for a wallet, via the Hiro API. */
export async function getStxBalance(
  address: string,
  network: StacksNetworkName = resolveNetworkName(),
): Promise<bigint | null> {
  const res = await fetch(`${getHiroApiUrl(network)}/extended/v1/address/${address}/stx`, {
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json()) as { balance?: string };
  if (!json.balance) return null;
  return BigInt(json.balance);
}

/** Confirmed sBTC balance (in sats) for a wallet, via the Hiro API. */
export async function getSbtcBalance(
  address: string,
  network: StacksNetworkName = resolveNetworkName(),
): Promise<bigint | null> {
  const res = await fetch(`${getHiroApiUrl(network)}/extended/v1/address/${address}/balances`, {
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json()) as { fungible_tokens?: Record<string, { balance?: string }> };
  // The API keys fungible tokens as "<contract-id>::<token-name>"; a wallet
  // that has never held sBTC simply has no entry.
  const entry = json.fungible_tokens?.[`${getSbtcContractId(network)}::sbtc-token`];
  return BigInt(entry?.balance ?? "0");
}
