"use client";

import { useMemo, useState } from "react";
import { Bitcoin, Minus, Plus, ShoppingCart } from "lucide-react";
import type { MarketToken, PaymentAsset } from "@rwaforge/types";
import { buildPurchaseTx, getSbtcBalance, getStxBalance } from "@rwaforge/stacks";
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
import { acceptedAssets, ASSET_DECIMALS, baseUnitsToNumber, priceIn } from "@/lib/payment";
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
  const assets = acceptedAssets(token);
  const [asset, setAsset] = useState<PaymentAsset>(assets[0] ?? "STX");
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);

  const soldOut = token.availableSupply === "0";
  const isOwnToken = session?.address === token.creator;

  const available = BigInt(token.availableSupply);
  const decimals = ASSET_DECIMALS[asset];
  const price = priceIn(token, asset);

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
    setInsufficientFunds(false);
    if (state !== "idle") reset();
  }

  function selectAsset(next: PaymentAsset) {
    setAsset(next);
    setInsufficientFunds(false);
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
    const balance = asset === "STX" ? await getStxBalance(session.address) : await getSbtcBalance(session.address);
    setCheckingBalance(false);
    if (balance !== null && cost !== null && balance < cost) {
      setInsufficientFunds(true);
      return;
    }
    setInsufficientFunds(false);
    if (cost === null) return;
    const outcome = await runContractCall(
      buildPurchaseTx({ tokenId: token.id, amount, asset, buyer: session.address, cost }),
    );
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
              <Label>Pay with</Label>
              {assets.length > 1 ? (
                <div className="mt-1.5 grid grid-cols-2 gap-2" role="group" aria-label="Payment asset">
                  {assets.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => selectAsset(a)}
                      aria-pressed={a === asset}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        a === asset
                          ? "border-primary/50 bg-primary-muted text-primary"
                          : "border-border-strong text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-foreground">
                  {asset} <span className="text-xs text-subtle-foreground">— the only asset this token accepts</span>
                </p>
              )}
              {asset === "sBTC" ? (
                <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  <Bitcoin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <strong className="text-foreground">Paying with Bitcoin-backed sBTC.</strong> It goes straight
                    to the creator in the same transaction that delivers your tokens — no swap into STX. The
                    network fee is still paid in a small amount of STX.
                  </span>
                </p>
              ) : assets.length === 1 ? (
                <p className="mt-2 text-xs text-subtle-foreground">
                  Holding Bitcoin? This creator hasn&apos;t enabled sBTC for this token yet.
                </p>
              ) : null}
            </div>

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
                    setInsufficientFunds(false);
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
                <p className="font-mono text-foreground">
                  {formatTokenAmount(price, decimals)} {asset}
                </p>
              </div>
              <div>
                <p className="text-xs text-subtle-foreground">Total</p>
                <p className="font-mono text-foreground">
                  {cost !== null ? (
                    <>
                      <AnimatedNumber
                        value={costNumber}
                        format={(n) =>
                          baseUnitsToNumber(n, asset).toLocaleString("en-US", { maximumFractionDigits: decimals })
                        }
                      />{" "}
                      {asset}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
            </div>

            {insufficientFunds && (
              <p className="text-xs text-destructive">
                Insufficient testnet {asset} balance to cover this purchase. Get testnet {asset} from the faucet linked in the docs.
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
