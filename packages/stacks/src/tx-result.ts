import { cvToJSON, hexToCV } from "@stacks/transactions";
import type { StacksNetworkName } from "@rwaforge/types";
import { getHiroApiUrl, resolveNetworkName } from "./network";
import type { CVJson } from "./cv";

/**
 * Fetches a confirmed transaction's actual Clarity return value (e.g. the
 * `(ok uint)` a `create-rwa` call returns) instead of inferring it from
 * current contract state, which would race against other confirmed
 * transactions. Only call this after `waitForConfirmation` reports success.
 */
export async function getConfirmedTxResult(
  txId: string,
  network: StacksNetworkName = resolveNetworkName(),
): Promise<CVJson | null> {
  const res = await fetch(`${getHiroApiUrl(network)}/extended/v1/tx/${txId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { tx_result?: { hex: string } };
  if (!json.tx_result?.hex) return null;
  return cvToJSON(hexToCV(json.tx_result.hex)) as CVJson;
}
