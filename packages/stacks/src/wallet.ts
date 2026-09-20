"use client";

import {
  connect as connectWallet,
  disconnect as disconnectWallet,
  getLocalStorage,
  isConnected as walletIsConnected,
  request,
} from "@stacks/connect";
import type { WalletSession, StacksNetworkName } from "@rwaforge/types";
import { getConnectNetworkString, resolveNetworkName } from "./network";

/**
 * Thin wrapper around @stacks/connect. Every other module in the app talks
 * to the wallet through these functions rather than importing @stacks/connect
 * directly, so the one place that would need to change if the underlying
 * wallet SDK's API shifts again is this file.
 */

export async function connect(): Promise<WalletSession | null> {
  const result = await connectWallet({ forceWalletSelect: false });
  const address = result.addresses.find((a) => a.symbol === "STX" || !a.symbol)?.address
    ?? result.addresses[0]?.address;
  if (!address) return null;
  return { address, network: resolveNetworkName() };
}

export function disconnect(): void {
  disconnectWallet();
}

export function isWalletConnected(): boolean {
  return walletIsConnected();
}

/** Reads the last-connected session from local storage without prompting the wallet. */
export function getStoredSession(): WalletSession | null {
  if (typeof window === "undefined") return null;
  const stored = getLocalStorage();
  const address = stored?.addresses.stx[0]?.address;
  if (!address) return null;
  return { address, network: resolveNetworkName() };
}

export interface ContractCallRequest {
  contract: string; // "ADDRESS.contract-name"
  functionName: string;
  functionArgs: unknown[]; // ClarityValue[]
  network?: StacksNetworkName;
  postConditions?: unknown[];
  postConditionMode?: "allow" | "deny";
}

export interface WalletTxResult {
  txId: string;
}

/** Requests a contract-call transaction signature from the connected wallet. */
export async function signContractCall(params: ContractCallRequest): Promise<WalletTxResult> {
  const response = await request("stx_callContract", {
    contract: params.contract as `${string}.${string}`,
    functionName: params.functionName,
    functionArgs: params.functionArgs as never,
    network: getConnectNetworkString(params.network),
    postConditions: params.postConditions as never,
    postConditionMode: params.postConditionMode,
  });
  if (!response.txid) {
    throw new Error("Wallet did not return a transaction id.");
  }
  return { txId: response.txid };
}
