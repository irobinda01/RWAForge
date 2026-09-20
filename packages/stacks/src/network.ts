import { STACKS_DEVNET, STACKS_MAINNET, STACKS_TESTNET } from "@stacks/network";
import type { StacksNetworkName } from "@rwaforge/types";

/**
 * RWAForge defaults to testnet for the MVP (see README / DEFINITION OF DONE).
 * Network selection is driven entirely by `NEXT_PUBLIC_STACKS_NETWORK` so the
 * same build can be pointed at devnet for local Clarinet integration testing.
 */
export function resolveNetworkName(): StacksNetworkName {
  const raw = (process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "testnet").toLowerCase();
  if (raw === "mainnet" || raw === "testnet" || raw === "devnet") return raw;
  return "testnet";
}

export function getStacksNetworkObject(name: StacksNetworkName = resolveNetworkName()) {
  switch (name) {
    case "mainnet":
      return STACKS_MAINNET;
    case "devnet":
      return STACKS_DEVNET;
    case "testnet":
    default:
      return STACKS_TESTNET;
  }
}

/** The string form @stacks/connect's `request()` expects for its `network` param. */
export function getConnectNetworkString(name: StacksNetworkName = resolveNetworkName()) {
  return name;
}

export function getHiroApiUrl(name: StacksNetworkName = resolveNetworkName()): string {
  const envUrl = process.env.NEXT_PUBLIC_STACKS_API_URL;
  if (envUrl) return envUrl;
  switch (name) {
    case "mainnet":
      return "https://api.hiro.so";
    case "devnet":
      return "http://localhost:3999";
    case "testnet":
    default:
      return "https://api.testnet.hiro.so";
  }
}

export function getExplorerTxUrl(txId: string, name: StacksNetworkName = resolveNetworkName()): string {
  const chain = name === "mainnet" ? "mainnet" : name === "devnet" ? "devnet" : "testnet";
  return `https://explorer.hiro.so/txid/${txId}?chain=${chain}`;
}

export function getExplorerAddressUrl(address: string, name: StacksNetworkName = resolveNetworkName()): string {
  const chain = name === "mainnet" ? "mainnet" : name === "devnet" ? "devnet" : "testnet";
  return `https://explorer.hiro.so/address/${address}?chain=${chain}`;
}
