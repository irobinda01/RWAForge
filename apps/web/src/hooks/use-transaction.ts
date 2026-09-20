"use client";

import { useCallback, useState } from "react";
import type { TransactionState } from "@rwaforge/types";
import { getExplorerTxUrl, signContractCall, waitForConfirmation, type ContractCallRequest } from "@rwaforge/stacks";

export interface TransactionOutcome {
  txId: string;
  explorerUrl: string;
}

/**
 * Drives the transaction lifecycle the whole app uses for any wallet-signed
 * action: preparing -> awaiting-wallet -> broadcasting -> confirming ->
 * confirmed | failed. Every mutating action (create, purchase) goes through
 * this hook so the UI never silently pretends a transaction succeeded before
 * the chain confirms it.
 */
export function useTransaction() {
  const [state, setState] = useState<TransactionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setTxId(null);
  }, []);

  const runContractCall = useCallback(async (request: ContractCallRequest): Promise<TransactionOutcome | null> => {
    setError(null);
    setState("preparing");
    try {
      setState("awaiting-wallet");
      const result = await signContractCall(request);
      setTxId(result.txId);
      setState("broadcasting");
      setState("confirming");
      const outcome = await waitForConfirmation(result.txId, { network: request.network });
      if (outcome.status === "confirmed") {
        setState("confirmed");
        return { txId: result.txId, explorerUrl: getExplorerTxUrl(result.txId, request.network) };
      }
      if (outcome.status === "failed") {
        setState("failed");
        setError(`Transaction failed on-chain (${outcome.reason}).`);
        return null;
      }
      setState("failed");
      setError("Timed out waiting for confirmation. Check the explorer link for the latest status — this transaction may still confirm.");
      return null;
    } catch (err) {
      setState("failed");
      setError(describeWalletError(err));
      return null;
    }
  }, []);

  return { state, error, txId, runContractCall, reset };
}

function describeWalletError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/user\s*reject|cancel/i.test(message)) return "Transaction was cancelled in the wallet.";
  if (/no\s*wallet|not\s*installed/i.test(message)) return "No Stacks wallet extension was found. Install Leather or Xverse to continue.";
  if (/insufficient/i.test(message)) return "Insufficient STX balance to cover network fees.";
  return message || "The wallet was unable to complete this request.";
}
