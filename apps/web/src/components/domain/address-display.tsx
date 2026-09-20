"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getExplorerAddressUrl } from "@rwaforge/stacks";
import type { StacksNetworkName } from "@rwaforge/types";
import { cn } from "@/lib/utils";

/**
 * For a plain wallet address, truncates evenly from both ends. For a
 * contract id ("ADDRESS.contract-name"), truncates only the address portion
 * and keeps the contract name in full -- it's short and meaningful, and
 * truncating it too produced almost no size reduction at all (the address
 * portion is always ~41 chars, so a naive truncate barely shortened
 * anything before the dot).
 */
export function truncateAddress(address: string, chars = 5) {
  const dotIndex = address.indexOf(".");
  if (dotIndex === -1) {
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}…${address.slice(-chars)}`;
  }
  const addressPart = address.slice(0, dotIndex);
  const contractPart = address.slice(dotIndex);
  if (addressPart.length <= chars * 2 + 3) return address;
  return `${addressPart.slice(0, chars)}…${addressPart.slice(-chars)}${contractPart}`;
}

export function AddressDisplay({
  address,
  network,
  className,
  showExplorerLink = true,
}: {
  address: string;
  network?: StacksNetworkName;
  className?: string;
  showExplorerLink?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    // This component is often rendered inside a clickable card/link; without
    // stopping propagation, "copy" would also trigger the parent's navigation.
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — try selecting the address manually.");
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[13px] text-foreground/90", className)}>
      <span title={address}>{truncateAddress(address)}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy address"
        className="relative flex h-3.5 w-3.5 items-center justify-center text-subtle-foreground transition-colors hover:text-foreground"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={copied ? "check" : "copy"}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </motion.span>
        </AnimatePresence>
      </button>
      {showExplorerLink && (
        <a
          href={getExplorerAddressUrl(address, network)}
          target="_blank"
          rel="noreferrer"
          aria-label="View on explorer"
          onClick={(e) => e.stopPropagation()}
          className="text-subtle-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
