import type { StacksNetworkName } from "@rwaforge/types";
import { getHiroApiUrl, resolveNetworkName } from "./network";

export type ConfirmationOutcome =
  | { status: "confirmed" }
  | { status: "failed"; reason: string }
  | { status: "timeout" };

/**
 * Polls the Hiro Stacks API for a transaction's status. Used to drive the
 * `confirming -> confirmed | failed` steps of the transaction state machine
 * (see docs/FRONTEND.md). Real testnet confirmation, no simulated delays.
 */
export async function waitForConfirmation(
  txId: string,
  options: { network?: StacksNetworkName; timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<ConfirmationOutcome> {
  const network = options.network ?? resolveNetworkName();
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const pollIntervalMs = options.pollIntervalMs ?? 4000;
  const apiUrl = getHiroApiUrl(network);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${apiUrl}/extended/v1/tx/${txId}`, { cache: "no-store" }).catch(() => null);
    if (res?.ok) {
      const json = (await res.json()) as { tx_status?: string };
      if (json.tx_status === "success") return { status: "confirmed" };
      if (json.tx_status && json.tx_status.startsWith("abort")) {
        return { status: "failed", reason: json.tx_status };
      }
      // pending / not yet broadcast-visible: keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return { status: "timeout" };
}
