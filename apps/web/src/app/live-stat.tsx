"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getMarketTokenCount } from "@rwaforge/stacks";
import { AnimatedNumber } from "@/components/domain/animated-number";

/**
 * A single, real, live-fetched stat -- the number of tokens actually
 * created on-chain. Renders nothing if the contract isn't configured or the
 * count is zero, rather than ever showing a placeholder/fabricated number.
 */
export function LiveStat() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMarketTokenCount()
      .then((c) => !cancelled && setCount(c))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!count) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
      <Sparkles className="h-3 w-3 text-primary" />
      <AnimatedNumber value={count} className="font-mono text-foreground" /> token
      {count === 1 ? "" : "s"} created on RWAForge so far
    </div>
  );
}
