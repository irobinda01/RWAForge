import { resolveNetworkName } from "@rwaforge/stacks";
import { cn } from "@/lib/utils";

export function NetworkIndicator({ className }: { className?: string }) {
  const network = resolveNetworkName();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", network === "mainnet" ? "bg-success" : "bg-warning")} />
      {network === "mainnet" ? "Mainnet" : network === "devnet" ? "Devnet" : "Testnet"}
    </span>
  );
}
