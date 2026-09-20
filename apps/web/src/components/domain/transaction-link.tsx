import { ExternalLink } from "lucide-react";
import { getExplorerTxUrl } from "@rwaforge/stacks";
import type { StacksNetworkName } from "@rwaforge/types";
import { cn } from "@/lib/utils";

export function TransactionLink({
  txId,
  network,
  className,
  label,
}: {
  txId: string;
  network?: StacksNetworkName;
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={getExplorerTxUrl(txId, network)}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-1.5 font-mono text-[13px] text-primary hover:underline", className)}
    >
      {label ?? `${txId.slice(0, 8)}…${txId.slice(-6)}`}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
