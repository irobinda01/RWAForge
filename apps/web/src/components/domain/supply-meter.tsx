"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Visual meter of remaining supply, filled from live on-chain available/total. */
export function SupplyMeter({
  available,
  total,
  className,
}: {
  available: bigint;
  total: bigint;
  className?: string;
}) {
  const pct = total > 0n ? Number((available * 10000n) / total) / 100 : 0;
  const soldOut = available === 0n;

  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-raised", className)}>
      <motion.div
        className={cn("h-full rounded-full", soldOut ? "bg-subtle-foreground" : "bg-primary")}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
