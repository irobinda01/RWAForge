"use client";

import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { motion } from "motion/react";
import type { TransactionState } from "@rwaforge/types";
import { TransactionLink } from "./transaction-link";
import { cn } from "@/lib/utils";

const MESSAGES: Record<TransactionState, string> = {
  idle: "",
  preparing: "Preparing your transaction…",
  "awaiting-wallet": "Confirm this in your wallet…",
  broadcasting: "Broadcasting to the Stacks network…",
  confirming: "Waiting for confirmation on-chain…",
  confirmed: "Confirmed on-chain.",
  failed: "This transaction could not be completed.",
};

const STEPS = [
  { key: "wallet", label: "Wallet" },
  { key: "broadcast", label: "Broadcast" },
  { key: "confirm", label: "Confirm" },
] as const;

/** Which step (0-2) the current state corresponds to, and whether every step up to it is "done". */
function stepIndexForState(state: TransactionState, hasTxId: boolean): number {
  switch (state) {
    case "preparing":
    case "awaiting-wallet":
      return 0;
    case "broadcasting":
      return 1;
    case "confirming":
      return 2;
    case "confirmed":
      return 3; // past the last step
    case "failed":
      // A txId means the wallet signed and it broadcast — the failure/timeout
      // happened while waiting for on-chain confirmation, not before.
      return hasTxId ? 2 : 0;
    default:
      return -1;
  }
}

/**
 * A visual, multi-step rendering of the wallet-tx state machine
 * (preparing -> awaiting-wallet -> broadcasting -> confirming -> confirmed |
 * failed) so nobody ever sees "contract-call?" or a bare error code, and so
 * progress feels tangible rather than a single flat status line.
 */
export function TransactionStatus({
  state,
  error,
  txId,
  className,
}: {
  state: TransactionState;
  error?: string | null;
  txId?: string | null;
  className?: string;
}) {
  if (state === "idle") return null;

  const failed = state === "failed";
  const confirmed = state === "confirmed";
  const currentStep = stepIndexForState(state, Boolean(txId));
  const progress = confirmed ? 1 : Math.max(currentStep, 0) / (STEPS.length - 1);

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-4 text-sm",
        confirmed && "border-success/30 bg-success-muted",
        failed && "border-destructive/30 bg-destructive-muted",
        !confirmed && !failed && "border-border-strong bg-surface",
        className,
      )}
    >
      <div className="relative mb-5 flex items-center justify-between px-1">
        <div className="absolute left-5 right-5 top-1/2 h-0.5 -translate-y-1/2 bg-border-strong" />
        <motion.div
          className={cn("absolute left-5 top-1/2 h-0.5 -translate-y-1/2", failed ? "bg-destructive" : "bg-success")}
          initial={{ width: 0 }}
          animate={{ width: `calc(${progress} * (100% - 40px))` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        {STEPS.map((step, i) => {
          const isDone = i < currentStep || confirmed || (failed && i < currentStep);
          const isFailedHere = failed && i === currentStep;
          const isActive = !failed && !confirmed && i === currentStep;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isFailedHere
                    ? "var(--destructive)"
                    : isDone || confirmed
                      ? "var(--success)"
                      : isActive
                        ? "var(--primary)"
                        : "var(--surface-raised)",
                }}
                transition={{ duration: 0.25 }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border-strong text-xs font-semibold"
              >
                {isFailedHere ? (
                  <X className="h-3.5 w-3.5 text-white" />
                ) : isDone || confirmed ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" />
                ) : (
                  <span className="text-subtle-foreground">{i + 1}</span>
                )}
              </motion.div>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isActive || isDone || confirmed ? "text-foreground" : "text-subtle-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2.5">
        {failed && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
        <div className="flex-1">
          <p className={cn(confirmed && "text-success", failed && "text-destructive", !confirmed && !failed && "text-foreground")}>
            {failed && error ? error : MESSAGES[state]}
          </p>
          {txId && (
            <p className="mt-1">
              <TransactionLink txId={txId} />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
