import { Bitcoin } from "lucide-react";
import type { MarketToken } from "@rwaforge/types";
import { Badge } from "@/components/ui/badge";
import { acceptedAssets } from "@/lib/payment";
import { cn } from "@/lib/utils";

/** True when a token can be bought with sBTC, i.e. it's open to Bitcoin holders. */
export function acceptsSbtc(token: Pick<MarketToken, "priceMicroStx" | "priceSats">): boolean {
  return acceptedAssets(token).includes("sBTC");
}

/**
 * Marks a token that Bitcoin holders can buy directly with sBTC. Renders
 * nothing for STX-only tokens, so the badge always means "yes, sBTC works".
 */
export function SbtcBadge({
  token,
  className,
}: {
  token: Pick<MarketToken, "priceMicroStx" | "priceSats">;
  className?: string;
}) {
  if (!acceptsSbtc(token)) return null;
  return (
    <Badge variant="primary" className={cn("shrink-0", className)} title="Bitcoin holders can buy this token with sBTC">
      <Bitcoin className="h-3 w-3" aria-hidden />
      sBTC
    </Badge>
  );
}
