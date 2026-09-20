import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MarketToken } from "@rwaforge/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "./address-display";
import { SupplyMeter } from "./supply-meter";
import { formatTokenAmount } from "@/lib/format";
import { TokenPrices } from "./token-prices";
import { SbtcBadge } from "./sbtc-badge";

export function MarketTokenCard({ token }: { token: MarketToken }) {
  const available = BigInt(token.availableSupply);
  const total = BigInt(token.totalSupply);
  const soldOut = available === 0n;

  return (
    <Link href={`/tokens/${token.id}`} className="group block h-full">
      <Card className="h-full transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-[0_0_0_1px_rgba(247,147,26,0.15),0_20px_40px_-20px_rgba(0,0,0,0.6)]">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">{token.name}</h3>
                <span className="font-mono text-xs text-subtle-foreground">{token.symbol}</span>
              </div>
              {soldOut ? (
                <Badge variant="warning">Sold out</Badge>
              ) : (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-subtle-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{token.category}</Badge>
              <SbtcBadge token={token} />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-subtle-foreground">Price</p>
                <p className="font-mono tabular-nums text-foreground">
                  <TokenPrices token={token} />
                </p>
              </div>
              <div>
                <p className="text-xs text-subtle-foreground">Available</p>
                <p className="font-mono tabular-nums text-foreground">
                  {formatTokenAmount(token.availableSupply, 0)} / {formatTokenAmount(token.totalSupply, 0)}
                </p>
              </div>
            </div>
            <SupplyMeter available={available} total={total} />
            <div>
              <p className="text-xs text-subtle-foreground">Creator</p>
              <AddressDisplay address={token.creator} network={token.network} showExplorerLink={false} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
