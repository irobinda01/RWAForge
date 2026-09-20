import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MarketToken } from "@rwaforge/types";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "./address-display";
import { SupplyMeter } from "./supply-meter";
import { CATEGORY_ICONS } from "@/lib/categories";
import { formatTokenAmount } from "@/lib/format";
import { TokenPrices } from "./token-prices";
import { SbtcBadge } from "./sbtc-badge";

export function MarketTokenRow({ token }: { token: MarketToken }) {
  const available = BigInt(token.availableSupply);
  const total = BigInt(token.totalSupply);
  const soldOut = available === 0n;
  const Icon = CATEGORY_ICONS[token.category as keyof typeof CATEGORY_ICONS];

  return (
    <Link href={`/tokens/${token.id}`} className="group block">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:bg-surface-raised sm:flex-row sm:items-center sm:gap-5">
        <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">{token.name}</h3>
            <span className="font-mono text-xs text-subtle-foreground">{token.symbol}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:w-40 sm:shrink-0">
          <Badge variant="outline">{token.category}</Badge>
          <SbtcBadge token={token} />
        </div>

        <div className="sm:w-36 sm:shrink-0">
          <p className="text-[11px] text-subtle-foreground">Price</p>
          <p className="font-mono text-sm tabular-nums text-foreground">
            <TokenPrices token={token} />
          </p>
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] text-subtle-foreground">
            <span>Available</span>
            <span className="font-mono">
              {formatTokenAmount(token.availableSupply, 0)} / {formatTokenAmount(token.totalSupply, 0)}
            </span>
          </div>
          <SupplyMeter available={available} total={total} className="mt-1" />
        </div>

        <div className="sm:w-40 sm:shrink-0">
          <p className="text-[11px] text-subtle-foreground">Creator</p>
          <AddressDisplay address={token.creator} network={token.network} showExplorerLink={false} />
        </div>

        <div className="flex justify-end sm:w-16 sm:shrink-0">
          {soldOut ? (
            <Badge variant="warning">Sold out</Badge>
          ) : (
            <ArrowUpRight className="h-4 w-4 text-subtle-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          )}
        </div>
      </div>
    </Link>
  );
}
