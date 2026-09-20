import { Suspense } from "react";
import type { Metadata } from "next";
import { TokensExplorer } from "./tokens-explorer";

export const metadata: Metadata = { title: "Explore Tokens" };

export default function TokensPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Explore Tokens</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every token below is read live from the RWAForge token-market contract on Stacks
          Testnet. Nothing here is fabricated or hardcoded.
        </p>
      </div>
      <Suspense fallback={<div className="shimmer h-52 rounded-xl border border-border bg-card" />}>
        <TokensExplorer />
      </Suspense>
    </div>
  );
}
