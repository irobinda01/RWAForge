"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Bitcoin, Check, PartyPopper, Sparkles } from "lucide-react";
import { PAYMENT_ASSETS, TOKEN_CATEGORIES, type PaymentAsset, type TokenCategory } from "@rwaforge/types";
import { buildCreateTokenTx, getConfirmedTxResult } from "@rwaforge/stacks";
import { useWallet } from "@/components/providers/wallet-provider";
import { useTransaction } from "@/hooks/use-transaction";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NetworkIndicator } from "@/components/domain/network-indicator";
import { EmptyState } from "@/components/domain/empty-state";
import { SupplyMeter } from "@/components/domain/supply-meter";
import { AnimatedNumber } from "@/components/domain/animated-number";
import { TransactionStatus } from "@/components/domain/transaction-status";
import { TransactionLink } from "@/components/domain/transaction-link";
import { CATEGORY_ICONS } from "@/lib/categories";
import { toBaseUnits } from "@/lib/format";
import { ASSET_DECIMALS, baseUnitsToNumber } from "@/lib/payment";
import { cn } from "@/lib/utils";

type Step = "form" | "confirm" | "success";

export default function CreateTokenPage() {
  const { session, connectWallet, connecting } = useWallet();
  const { state, error, txId, runContractCall, reset } = useTransaction();
  const [step, setStep] = useState<Step>("form");
  const [createdTokenId, setCreatedTokenId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TokenCategory>("Real Estate");
  const [totalSupply, setTotalSupply] = useState("");
  const [priceStx, setPriceStx] = useState("");
  const [priceSbtc, setPriceSbtc] = useState("");

  const errors = validate({ name, symbol, description, totalSupply, priceStx, priceSbtc });
  const isValid = Object.keys(errors).length === 0;
  const busy = state === "awaiting-wallet" || state === "broadcasting" || state === "confirming";

  async function handleCreate() {
    if (!isValid) return;
    const totalSupplyUnits = BigInt(totalSupply.trim());
    // An empty price field means "this asset isn't accepted" (price 0 on-chain).
    const priceMicroStx = priceStx.trim() ? toBaseUnits(priceStx.trim(), ASSET_DECIMALS.STX) : 0n;
    const priceSats = priceSbtc.trim() ? toBaseUnits(priceSbtc.trim(), ASSET_DECIMALS.sBTC) : 0n;
    const outcome = await runContractCall(
      buildCreateTokenTx({ name, symbol, description, category, totalSupply: totalSupplyUnits, priceMicroStx, priceSats }),
    );
    if (!outcome) return;
    const txResult = await getConfirmedTxResult(outcome.txId);
    const tokenId = txResult?.success && typeof txResult.value === "object" && txResult.value !== null
      ? Number((txResult.value as { value: unknown }).value)
      : null;
    setCreatedTokenId(tokenId);
    setStep("success");
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={Sparkles}
          title="Connect your Stacks wallet to continue."
          description="You'll need a Stacks Testnet wallet (Leather or Xverse) to create a token."
          action={
            <Button onClick={() => void connectWallet()} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect Wallet"}
            </Button>
          }
        />
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}>
          <Card className="relative overflow-hidden border-success/30 bg-success-muted">
            <SuccessBurst />
            <CardContent className="relative flex flex-col items-center gap-4 p-8 text-center">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20"
              >
                <PartyPopper className="h-7 w-7 text-success" />
              </motion.div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Token created successfully.</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {name} ({symbol}) is now live on Stacks Testnet.
                </p>
              </div>
              {txId && <TransactionLink txId={txId} />}
              <div className="mt-2 flex gap-3">
                {createdTokenId !== null && (
                  <Button asChild>
                    <Link href={`/tokens/${createdTokenId}`}>View Token</Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/tokens">Explore Tokens</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <AnimatePresence>
          {step === "confirm" && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={() => {
                setStep("form");
                reset();
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to edit
            </motion.button>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Create Token</h1>
          <NetworkIndicator />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This deploys a real token record on the RWAForge token-market contract via a single
          wallet-signed Stacks Testnet transaction. Price it in STX, sBTC, or both — buyers pay in
          whichever you accept.
        </p>
        <StepIndicator step={step} />
      </div>

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait" initial={false}>
            {step === "form" ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Card>
                  <CardContent className="flex flex-col gap-5 p-6">
                    <Field label="Token Name" error={errors.name} valid={!errors.name && name.trim().length > 0}>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lagos Property Token" maxLength={64} />
                    </Field>
                    <Field label="Token Symbol" error={errors.symbol} valid={!errors.symbol && symbol.trim().length > 0}>
                      <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="LPT" maxLength={10} />
                    </Field>
                    <Field
                      label="Description"
                      error={errors.description}
                      valid={!errors.description && description.trim().length > 0}
                      hint={`${description.length}/500`}
                    >
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Testnet token representing an investment interest in a fictional property project."
                        maxLength={500}
                      />
                    </Field>
                    <Field label="Category">
                      <CategoryPicker value={category} onChange={setCategory} />
                    </Field>
                    <Field label="Total Supply" error={errors.totalSupply} valid={!errors.totalSupply && totalSupply.trim().length > 0}>
                      <Input
                        inputMode="numeric"
                        value={totalSupply}
                        onChange={(e) => setTotalSupply(e.target.value)}
                        placeholder="100000"
                      />
                    </Field>
                    <div>
                      <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary-muted px-3.5 py-3">
                        <Bitcoin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <div className="text-xs leading-relaxed text-muted-foreground">
                          <p className="font-medium text-foreground">Accept sBTC to reach Bitcoin holders</p>
                          <p className="mt-0.5">
                            Set a price in STX, sBTC, or both, and buyers pay in whichever they hold. An sBTC
                            price lets Bitcoin holders buy your token without converting to another asset first.
                            Leave a price empty to not accept that asset. Each price is exactly what you enter —
                            RWAForge doesn&apos;t convert between them.
                          </p>
                          {priceStx.trim() && !priceSbtc.trim() && (
                            <p className="mt-1.5 text-primary">
                              Tip: this token is STX-only right now — add an sBTC price to open it to Bitcoin holders.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field
                          label="Price / Token (STX)"
                          error={errors.priceStx}
                          valid={!errors.priceStx && priceStx.trim().length > 0}
                        >
                          <Input inputMode="decimal" value={priceStx} onChange={(e) => setPriceStx(e.target.value)} placeholder="1" />
                        </Field>
                        <Field
                          label="Price / Token (sBTC)"
                          error={errors.priceSbtc}
                          valid={!errors.priceSbtc && priceSbtc.trim().length > 0}
                        >
                          <Input
                            inputMode="decimal"
                            value={priceSbtc}
                            onChange={(e) => setPriceSbtc(e.target.value)}
                            placeholder="0.00001"
                          />
                        </Field>
                      </div>
                      {errors.price && <p className="mt-1.5 text-xs text-destructive">{errors.price}</p>}
                    </div>

                    <Button size="lg" disabled={!isValid} onClick={() => setStep("confirm")} className="group">
                      Continue to Review
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <Card>
                  <CardContent className="flex flex-col gap-5 p-6">
                    <SummaryRow label="Token" value={name} />
                    <SummaryRow label="Symbol" value={symbol} />
                    <SummaryRow label="Category" value={category} />
                    <SummaryRow label="Supply" value={Number(totalSupply).toLocaleString("en-US")} />
                    {priceStx.trim() && <SummaryRow label="Price (STX)" value={`${priceStx.trim()} STX`} />}
                    {priceSbtc.trim() && <SummaryRow label="Price (sBTC)" value={`${priceSbtc.trim()} sBTC`} />}
                    <SummaryRow label="Network" value="Stacks Testnet" />

                    <Button size="lg" onClick={() => void handleCreate()} disabled={busy}>
                      Confirm & Create Token
                    </Button>

                    <TransactionStatus state={state} error={error} txId={txId} />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="lg:sticky lg:top-24 lg:col-span-2">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-subtle-foreground">Live preview</p>
          <TokenPreviewCard
            name={name}
            symbol={symbol}
            category={category}
            totalSupply={totalSupply}
            priceStx={priceStx}
            priceSbtc={priceSbtc}
          />
        </div>
      </div>
    </div>
  );
}

function TokenPreviewCard({
  name,
  symbol,
  category,
  totalSupply,
  priceStx,
  priceSbtc,
}: {
  name: string;
  symbol: string;
  category: string;
  totalSupply: string;
  priceStx: string;
  priceSbtc: string;
}) {
  const rawSupply = Number(totalSupply.replace(/[^\d]/g, "")) || 0;
  const meterSupply = rawSupply || 1;
  // Price per token in each asset's base unit; 0 = not accepted (or not yet valid).
  const prices: Record<PaymentAsset, number> = {
    STX: Math.round((Number(priceStx) || 0) * 10 ** ASSET_DECIMALS.STX),
    sBTC: Math.round((Number(priceSbtc) || 0) * 10 ** ASSET_DECIMALS.sBTC),
  };
  const shownAssets = PAYMENT_ASSETS.filter((asset) => prices[asset] > 0 && rawSupply > 0);
  const enteredAssets = PAYMENT_ASSETS.filter((asset) => prices[asset] > 0);

  const [simAmount, setSimAmount] = useState(100);
  const simClamped = rawSupply > 0 ? Math.min(simAmount, rawSupply) : 0;

  return (
    <Card className="overflow-hidden border-primary/20 bg-linear-to-b from-card to-surface">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{name || "Your Token Name"}</h3>
            <span className="font-mono text-xs text-subtle-foreground">{symbol || "SYMBOL"}</span>
          </div>
          <Badge variant="primary" className="shrink-0">Preview</Badge>
        </div>
        <Badge variant="outline" className="w-fit">{category}</Badge>

        <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-subtle-foreground">Price</p>
              <p className="font-mono tabular-nums text-foreground">
                {enteredAssets.length > 0
                  ? enteredAssets.map((asset) => (
                      <span key={asset} className="block">
                        {asset === "STX" ? priceStx.trim() : priceSbtc.trim()} {asset}
                      </span>
                    ))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-subtle-foreground">Total Supply</p>
              <p className="font-mono tabular-nums text-foreground">{rawSupply ? rawSupply.toLocaleString("en-US") : "—"}</p>
            </div>
          </div>
          <SupplyMeter available={BigInt(meterSupply)} total={BigInt(meterSupply)} />
          <div className="rounded-lg border border-border bg-surface/60 p-3">
            <p className="text-xs text-subtle-foreground">Total listing value</p>
            <p className="font-mono text-base tabular-nums text-foreground">
              {shownAssets.length > 0
                ? shownAssets.map((asset) => (
                    <span key={asset} className="block">
                      <AnimatedNumber
                        value={rawSupply * prices[asset]}
                        format={(n) => baseUnitsToNumber(n, asset).toLocaleString("en-US", { maximumFractionDigits: ASSET_DECIMALS[asset] })}
                      />{" "}
                      {asset}
                    </span>
                  ))
                : "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-subtle-foreground">Total supply × price, if every token sold.</p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium text-foreground">Preview a purchase</p>
          <p className="mt-0.5 text-[11px] text-subtle-foreground">What a buyer would pay for {simClamped.toLocaleString("en-US")} {symbol || "tokens"}.</p>
          <input
            type="range"
            className="rwaforge-slider mt-3"
            min={0}
            max={rawSupply || 1}
            step={Math.max(1, Math.round((rawSupply || 1) / 200))}
            value={simClamped}
            disabled={!rawSupply}
            onChange={(e) => setSimAmount(Number(e.target.value))}
            aria-label="Simulate a purchase amount"
          />
          <p className="mt-2 text-right font-mono text-sm tabular-nums text-foreground">
            {shownAssets.length > 0
              ? shownAssets.map((asset) => (
                  <span key={asset} className="block">
                    <AnimatedNumber
                      value={simClamped * prices[asset]}
                      format={(n) => baseUnitsToNumber(n, asset).toLocaleString("en-US", { maximumFractionDigits: ASSET_DECIMALS[asset] })}
                    />{" "}
                    {asset}
                  </span>
                ))
              : "—"}
          </p>
        </div>

        <p className="text-xs text-subtle-foreground">
          This is exactly how your token will appear on <span className="text-foreground">/tokens</span> once created — with
          the full supply available to buy.
        </p>
      </CardContent>
    </Card>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = ["Details", "Review & Confirm"];
  const activeIndex = step === "form" ? 0 : 1;
  return (
    <div className="mt-5 flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                i < activeIndex
                  ? "bg-success text-white"
                  : i === activeIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-raised text-subtle-foreground",
              )}
            >
              {i < activeIndex ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={cn("text-xs font-medium", i <= activeIndex ? "text-foreground" : "text-subtle-foreground")}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && <div className="h-px w-8 bg-border-strong" />}
        </div>
      ))}
    </div>
  );
}

function CategoryPicker({ value, onChange }: { value: TokenCategory; onChange: (c: TokenCategory) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {TOKEN_CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICONS[c];
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
              active
                ? "border-primary/50 bg-primary-muted text-primary"
                : "border-border-strong text-muted-foreground hover:bg-surface-raised hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[11px] font-medium leading-tight">{c}</span>
          </button>
        );
      })}
    </div>
  );
}

function SuccessBurst() {
  const particles = Array.from({ length: 10 });
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex h-0 justify-center" aria-hidden>
      {particles.map((_, i) => {
        const angle = (i / particles.length) * Math.PI - Math.PI / 2;
        const distance = 90 + (i % 3) * 20;
        return (
          <motion.span
            key={i}
            className={cn("absolute h-1.5 w-1.5 rounded-full", i % 2 === 0 ? "bg-primary" : "bg-success")}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance + 40,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.02, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

function Field({
  label,
  error,
  valid,
  hint,
  children,
}: {
  label: string;
  error?: string;
  valid?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label>{label}</Label>
          <AnimatePresence>
            {valid && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="h-3.5 w-3.5 text-success" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {hint && <span className="text-[11px] text-subtle-foreground">{hint}</span>}
      </div>
      <div className="mt-1.5">{children}</div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-subtle-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

const ASCII_ONLY = /^[\x20-\x7E]*$/;

function validate(fields: {
  name: string;
  symbol: string;
  description: string;
  totalSupply: string;
  priceStx: string;
  priceSbtc: string;
}) {
  const errors: Record<string, string> = {};
  if (!fields.name.trim()) errors.name = "Token name is required.";
  else if (!ASCII_ONLY.test(fields.name)) errors.name = "Use standard letters, numbers, and punctuation only.";
  if (!fields.symbol.trim()) errors.symbol = "Token symbol is required.";
  else if (fields.symbol.trim().length > 10) errors.symbol = "Symbol must be 10 characters or fewer.";
  else if (!ASCII_ONLY.test(fields.symbol)) errors.symbol = "Use standard letters and numbers only.";
  if (!fields.description.trim()) errors.description = "Description is required.";
  if (!/^\d+$/.test(fields.totalSupply.trim()) || BigInt(fields.totalSupply.trim() || "0") <= 0n) {
    errors.totalSupply = "Enter a whole number greater than zero.";
  }

  const stxError = validatePrice(fields.priceStx, "STX");
  const sbtcError = validatePrice(fields.priceSbtc, "sBTC");
  if (stxError) errors.priceStx = stxError;
  if (sbtcError) errors.priceSbtc = sbtcError;
  if (!fields.priceStx.trim() && !fields.priceSbtc.trim()) errors.price = "Set a price in STX, sBTC, or both.";
  return errors;
}

/** A price is optional (empty = asset not accepted), but if present it must be a positive amount the asset's base unit can represent. */
function validatePrice(raw: string, asset: PaymentAsset): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (!/^\d*\.?\d+$/.test(value)) return "Enter a price greater than zero.";
  const decimals = ASSET_DECIMALS[asset];
  if ((value.split(".")[1]?.length ?? 0) > decimals) return `${asset} supports up to ${decimals} decimal places.`;
  if (toBaseUnits(value, decimals) <= 0n) return "Enter a price greater than zero.";
  return undefined;
}
