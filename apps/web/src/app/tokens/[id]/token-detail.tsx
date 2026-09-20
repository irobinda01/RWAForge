"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, PackageX, RefreshCw } from "lucide-react";
import type { MarketToken } from "@rwaforge/types";
import { getMarketBalance, getMarketContractId, getMarketToken, resolveNetworkName } from "@rwaforge/stacks";
import { useWallet } from "@/components/providers/wallet-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { AddressDisplay } from "@/components/domain/address-display";
import { NetworkIndicator } from "@/components/domain/network-indicator";
import { SupplyMeter } from "@/components/domain/supply-meter";
import { AnimatedNumber } from "@/components/domain/animated-number";
import { formatBlockHeight, formatTokenAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TokenPrices } from "@/components/domain/token-prices";
import { SbtcBadge } from "@/components/domain/sbtc-badge";
import { PurchasePanel } from "./purchase-panel";

export function TokenDetail({ tokenId }: { tokenId: number }) {
  const { session } = useWallet();
  const [token, setToken] = useState<MarketToken | null | undefined>(undefined);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!Number.isFinite(tokenId) || tokenId < 0) {
        setToken(null);
        return;
      }
      if (isRefresh) setRefreshing(true);
      try {
        const result = await getMarketToken(tokenId);
        setToken(result);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error && /NEXT_PUBLIC_MARKET_CONTRACT_ID/.test(err.message)
            ? "RWAForge isn't configured with a token-market contract address yet. See the README to deploy and configure one."
            : "Couldn't reach the Stacks Testnet API. Try again in a moment.",
        );
        setToken(null);
      } finally {
        setRefreshing(false);
      }
    },
    [tokenId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!session || !token) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    getMarketBalance(tokenId, session.address).then((b) => {
      if (!cancelled) setBalance(b);
    });
    return () => {
      cancelled = true;
    };
  }, [session, token, tokenId]);

  if (token === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <div className="shimmer h-8 w-64 rounded-md bg-surface" />
        <div className="shimmer h-64 rounded-xl border border-border bg-card" />
      </div>
    );
  }

  if (token === null) {
    return (
      <EmptyState
        icon={PackageX}
        title={error ?? "Token not found"}
        description={error ? undefined : "This token id doesn't exist on the RWAForge token-market contract for this network."}
        action={
          <Button asChild variant="outline">
            <Link href="/tokens">
              <ArrowLeft className="h-4 w-4" /> Back to tokens
            </Link>
          </Button>
        }
      />
    );
  }

  const available = BigInt(token.availableSupply);
  const total = BigInt(token.totalSupply);
  const soldOut = available === 0n;
  let contractId: string | null = null;
  try {
    contractId = getMarketContractId();
  } catch {
    contractId = null;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/tokens" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to tokens
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{token.name}</h1>
            <span className="font-mono text-sm text-subtle-foreground">{token.symbol}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{token.category}</Badge>
            <SbtcBadge token={token} />
            {soldOut && <Badge variant="warning">Sold out</Badge>}
            <NetworkIndicator />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} /> Refresh
        </Button>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="flex flex-col gap-6 lg:col-span-3"
        >
          <Card>
            <CardContent className="p-5">
              <h2 className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">On-Chain Verified</h2>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-subtle-foreground">
                  <span>Supply sold</span>
                  <span className="font-mono">
                    {formatTokenAmount(token.availableSupply, 0)} / {formatTokenAmount(token.totalSupply, 0)} available
                  </span>
                </div>
                <SupplyMeter available={available} total={total} className="mt-1.5" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Field label="Token ID">#{token.id}</Field>
                <Field label="Creator">
                  <AddressDisplay address={token.creator} network={token.network} />
                </Field>
                <Field label="Contract">
                  {contractId ? <AddressDisplay address={contractId} network={token.network} /> : "—"}
                </Field>
                <Field label="Price">
                  <TokenPrices token={token} />
                </Field>
                <Field label="Total Supply">{formatTokenAmount(token.totalSupply, 0)}</Field>
                <Field label="Available">{formatTokenAmount(token.availableSupply, 0)}</Field>
                <Field label="Created at block">{formatBlockHeight(token.createdAtBlock)}</Field>
                <Field label="Network">{resolveNetworkName()}</Field>
                {session && (
                  <Field label="Your balance">
                    {balance !== null ? (
                      <AnimatedNumber value={Number(balance)} />
                    ) : (
                      "…"
                    )}
                  </Field>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent-blue/20">
            <CardContent className="p-5">
              <h2 className="text-xs font-medium uppercase tracking-wide text-accent-blue">Creator-Provided Information</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Supplied by the token&apos;s creator and stored on-chain verbatim. RWAForge does not
                independently verify that this token represents the described real-world asset.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{token.description}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="lg:sticky lg:top-24 lg:col-span-2"
        >
          <PurchasePanel token={token} onPurchased={() => load(true)} />
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-subtle-foreground">{label}</p>
      <div className="mt-0.5 font-mono text-foreground">{children}</div>
    </div>
  );
}
