"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ContractStatusBadge } from "./contract-status-badge";
import type { ProtocolContract } from "@/lib/protocol";
import { cn } from "@/lib/utils";

/** An expandable card for one protocol contract -- used on both the homepage teaser and the full docs reference. */
export function ContractCard({ contract, defaultOpen = false }: { contract: ProtocolContract; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        contract.status === "live" ? "border-success/25" : "hover:border-border-strong",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-subtle-foreground">{contract.file}</span>
            <ContractStatusBadge status={contract.status} />
          </div>
          <h3 className="mt-1.5 font-semibold text-foreground">{contract.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{contract.summary}</p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-subtle-foreground"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (contract.details.length > 0 || contract.keyFunctions.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-border px-5 pb-5 pt-4">
              {contract.details.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
              {contract.keyFunctions.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {contract.keyFunctions.map((fn) => (
                    <code
                      key={fn}
                      className="rounded-md border border-border-strong bg-surface px-2 py-1 font-mono text-[11px] text-foreground/80"
                    >
                      {fn}
                    </code>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
