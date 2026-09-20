"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { MarketToken } from "@rwaforge/types";
import { buildPurchaseTx, getStxBalance } from "@rwaforge/stacks";
import { useWallet } from "@/components/providers/wallet-provider";
import { useTransaction } from "@/hooks/use-transaction";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionStatus } from "@/components/domain/transaction-status";
import { EmptyState } from "@/components/domain/empty-state";
import { AnimatedNumber } from "@/components/domain/animated-number";
import { formatTokenAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK_FRACTIONS = [
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "Max", value: 1 },
];

export function PurchasePanel({ token, onPurchased }: { token: MarketToken; onPurchased: () => void }) {
  const { session, connectWallet, connecting } = useWallet();
  const { state, error, txId, runContractCall, reset } = useTransaction();
  const [amountInput, setAmountInput] = useState("");
  const [insufficientStx, setInsufficientStx] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const soldOut = token.availableSupply === "0";
  const isOwnToken = session?.address === token.creator;

  const available = BigInt(token.availableSupply);
  const price = BigInt(token.priceMicroStx);

  const amount = useMemo(() => {
    if (!/^\d+$/.test(amountInput.trim())) return null;
    try {
      return BigInt(amountInput.trim());
    } catch {
      return null;
    }
  }, [amountInput]);

  const cost = amount !== null ? amount * price : null;
  const costNumber = cost !== null ? Number(cost) : 0;

  const validationError =
    amount === null
      ? amountInput.trim() === ""
        ? null
        : "Enter a whole number of tokens."
      : amount <= 0n
        ? "Amount must be greater than zero."
        : amount > available
          ? "Amount exceeds available supply."
          : null;

  function setAmount(next: bigint) {
    const clamped = next < 0n ? 0n : next > available ? available : next;
    setAmountInput(clamped === 0n ? "" : clamped.toString());
    setInsufficientStx(false);
    if (state !== "idle") reset();
  }

  // Slider precision: for very large supplies, stepping by 1 makes the
  // slider crawl -- step in round increments instead, capped at a sane
  // number of steps.
  const sliderMax = available > 100_000_000n ? 100_000_000 : Number(available);
  const sliderStep = Math.max(1, Math.round(sliderMax / 200));
  const sliderValue = amount !== null ? Math.min(Number(amount), sliderMax) : 0;

  async function handlePurchase() {
    if (!session || amount === null || validationError) return;
    setCheckingBalance(true);
    const stxBalance = await getStxBalance(session.address);
    setCheckingBalance(false);
    if (stxBalance !== null && cost !== null && stxBalance < cost) {
      setInsufficientStx(true);
      return;
    }
    setInsufficientStx(false);
    const outcome = await runContractCall(buildPurchaseTx({ tokenId: token.id, amount }));
    if (outcome) {
      onPurchased();
    }
  }

  const busy = state === "preparing" || state === "awaiting-wallet" || state === "broadcasting" || state === "confirming";

  if (soldOut) {
    return (
      <Card>
        <CardContent className="p-5">
          <EmptyState icon={ShoppingCart} title="This token is currently sold out." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold text-foreground">Buy {token.symbol}</h2>

        {!session ? (
          <EmptyState
            icon={ShoppingCart}
            title="Connect your Stacks wallet to continue."
            action={
              <Button onClick={() => void connectWallet()} disabled={connecting}>
                {connecting ? "Connecting…" : "Connect Wallet"}
              </Button>
            }
          />
        ) : isOwnToken ? (
          <p className="text-sm text-muted-foreground">You created this token, so you can&apos;t purchase it yourself.</p>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount</Label>
                <div className="flex gap-1">
                  {QUICK_FRACTIONS.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => setAmount((available * BigInt(Math.round(f.value * 1000))) / 1000n)}
                      className="rounded-full border border-border-strong px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setAmount((amount ?? 0n) - 1n)}
                  disabled={!amount || amount <= 0n}
                  aria-label="Decrease amount"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="amount"
                  inputMode="numeric"
                  placeholder="100"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value.replace(/[^\d]/g, ""));
                    setInsufficientStx(false);
                    if (state !== "idle") reset();
                  }}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setAmount((amount ?? 0n) + 1n)}
                  disabled={amount !== null && amount >= available}
                  aria-label="Increase amount"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <input
                type="range"
                className="rwaforge-slider mt-3"
                min={0}
                max={sliderMax}
                step={sliderStep}
                value={sliderValue}
                onChange={(e) => setAmount(BigInt(e.target.value))}
                aria-label="Amount slider"
              />
              {validationError && <p className="mt-1.5 text-xs text-destructive">{validationError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface/60 p-4 text-sm">
              <div>
                <p className="text-xs text-subtle-foreground">Price</p>
                <p className="font-mono text-foreground">{formatTokenAmount(token.priceMicroStx, 6)} STX</p>
              </div>
              <div>
                <p className="text-xs text-subtle-foreground">Total</p>
                <p className="font-mono text-foreground">
                  {cost !== null ? (
                    <>
                      <AnimatedNumber
                        value={costNumber}
                        format={(n) => (n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 6 })}
                      />{" "}
                      STX
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>

            {insufficientStx && (
              <p className="text-xs text-destructive">
                Insufficient testnet STX balance to cover this purchase. Get testnet STX from the faucet linked in the docs.
              </p>
            )}

            <Button
              onClick={() => void handlePurchase()}
              disabled={!amount || Boolean(validationError) || checkingBalance || busy}
              className={cn(busy && "animate-pulse")}
            >
              {checkingBalance ? "Checking balance…" : "Purchase Tokens"}
            </Button>

            <TransactionStatus state={state} error={error} txId={txId} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
