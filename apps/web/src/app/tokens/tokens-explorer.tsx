"use client";

import { useEffect, useMemo, useState } from "react";
import { Bitcoin, LayoutGrid, List, RefreshCw, Search, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import type { MarketToken } from "@rwaforge/types";
import { TOKEN_CATEGORIES } from "@rwaforge/types";
import { getAllMarketTokens, getMarketBalance } from "@rwaforge/stacks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/domain/empty-state";
import { MarketTokenCard } from "@/components/domain/market-token-card";
import { MarketTokenRow } from "@/components/domain/market-token-row";
import { AnimatedNumber } from "@/components/domain/animated-number";
import { acceptsSbtc } from "@/components/domain/sbtc-badge";
import { useWallet } from "@/components/providers/wallet-provider";
import { CATEGORY_ICONS } from "@/lib/categories";
import { formatTokenAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "price-asc" | "price-desc" | "available-desc";
type ViewMode = "grid" | "list";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price (STX): low to high" },
  { value: "price-desc", label: "Price (STX): high to low" },
  { value: "available-desc", label: "Most available" },
];

function matchesQuery(token: MarketToken, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    token.name.toLowerCase().includes(q) ||
    token.symbol.toLowerCase().includes(q) ||
    token.creator.toLowerCase().includes(q)
  );
}

export function TokensExplorer() {
  const { session } = useWallet();
  const [tokens, setTokens] = useState<MarketToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  // Deep link from the homepage: /tokens?asset=sbtc opens with the sBTC filter on.
  const searchParams = useSearchParams();
  const [sbtcOnly, setSbtcOnly] = useState(searchParams.get("asset") === "sbtc");
  const [holdingsOnly, setHoldingsOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [balances, setBalances] = useState<Map<number, bigint>>(new Map());
  const [balancesLoading, setBalancesLoading] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const items = await getAllMarketTokens();
      setTokens(items);
    } catch (err) {
      setError(
        err instanceof Error && /NEXT_PUBLIC_MARKET_CONTRACT_ID/.test(err.message)
          ? "RWAForge isn't configured with a token-market contract address yet. See the README to deploy and configure one."
          : "Couldn't reach the Stacks Testnet API. Try again in a moment.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Reads the connected wallet's share of every listed token so the explorer
  // can surface "your shares" alongside each listing, not just on the detail page.
  useEffect(() => {
    if (!session || tokens.length === 0) {
      setBalances(new Map());
      return;
    }
    let cancelled = false;
    setBalancesLoading(true);
    Promise.all(tokens.map((t) => getMarketBalance(t.id, session.address).then((b) => [t.id, b] as const)))
      .then((entries) => {
        if (!cancelled) setBalances(new Map(entries));
      })
      .finally(() => {
        if (!cancelled) setBalancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, tokens]);

  const sbtcCount = useMemo(() => tokens.filter(acceptsSbtc).length, [tokens]);

  const heldCount = useMemo(
    () => tokens.filter((t) => (balances.get(t.id) ?? 0n) > 0n).length,
    [tokens, balances],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tokens) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return counts;
  }, [tokens]);

  const stats = useMemo(() => {
    const soldOut = tokens.filter((t) => t.availableSupply === "0").length;
    // STX and sBTC can't be added together, so listing value is one total per asset.
    const totalValueStx = tokens.reduce((sum, t) => sum + BigInt(t.totalSupply) * BigInt(t.priceMicroStx), 0n);
    const totalValueSats = tokens.reduce((sum, t) => sum + BigInt(t.totalSupply) * BigInt(t.priceSats), 0n);
    const categoriesLive = new Set(tokens.map((t) => t.category)).size;
    return { soldOut, totalValueStx, totalValueSats, categoriesLive };
  }, [tokens]);

  const filtered = useMemo(() => {
    const result = tokens.filter((t) => {
      if (!matchesQuery(t, query)) return false;
      if (category !== "all" && t.category !== category) return false;
      if (sbtcOnly && !acceptsSbtc(t)) return false;
      if (holdingsOnly && !((balances.get(t.id) ?? 0n) > 0n)) return false;
      return true;
    });
    return result.sort((a, b) => {
      switch (sort) {
        // Prices are compared in STX; sBTC-only tokens have no STX price
        // and sort last in either direction.
        case "price-asc":
        case "price-desc": {
          const priceA = BigInt(a.priceMicroStx);
          const priceB = BigInt(b.priceMicroStx);
          if (priceA === 0n || priceB === 0n) return priceA === priceB ? b.id - a.id : priceA === 0n ? 1 : -1;
          return Number(sort === "price-asc" ? priceA - priceB : priceB - priceA);
        }
        case "available-desc":
          return Number(BigInt(b.availableSupply) - BigInt(a.availableSupply));
        case "newest":
        default:
          return b.id - a.id;
      }
    });
  }, [tokens, query, category, sort, sbtcOnly, holdingsOnly, balances]);

  // If the wallet disconnects while "My holdings" is active, drop back to the
  // full list instead of silently showing an empty, stale filter.
  useEffect(() => {
    if (!session) setHoldingsOnly(false);
  }, [session]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer h-52 rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Couldn't load tokens"
        description={error}
        action={<Button onClick={() => void load()}>Try again</Button>}
      />
    );
  }

  if (tokens.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No tokens have been created yet."
        description="Be the first creator on RWAForge."
        action={
          <Button asChild>
            <Link href="/create">Create Token</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className={cn("mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4", session && "lg:grid-cols-5")}>
        <StatTile label="Tokens listed">
          <AnimatedNumber value={tokens.length} />
        </StatTile>
        <StatTile label="Categories active">
          <AnimatedNumber value={stats.categoriesLive} />
        </StatTile>
        <StatTile label="Sold out">
          <AnimatedNumber value={stats.soldOut} />
        </StatTile>
        <StatTile label="Combined listing value" hint="Total supply × price, summed across every token — not trading volume.">
          {stats.totalValueStx > 0n && <span className="block">{formatTokenAmount(stats.totalValueStx, 6)} STX</span>}
          {stats.totalValueSats > 0n && <span className="block">{formatTokenAmount(stats.totalValueSats, 8)} sBTC</span>}
        </StatTile>
        {session && (
          <StatTile label="Tokens you hold" hint="Listed tokens where your connected wallet holds a nonzero share.">
            {balancesLoading && balances.size === 0 ? (
              <span className="text-subtle-foreground">…</span>
            ) : (
              <>
                <AnimatedNumber value={heldCount} /> <span className="text-sm text-subtle-foreground">/ {tokens.length}</span>
              </>
            )}
          </StatTile>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <CategoryPill label="All" count={tokens.length} active={category === "all"} onClick={() => setCategory("all")} />
        {TOKEN_CATEGORIES.map((c) => (
          <CategoryPill
            key={c}
            label={c}
            icon={CATEGORY_ICONS[c]}
            count={categoryCounts.get(c) ?? 0}
            active={category === c}
            onClick={() => setCategory(c)}
          />
        ))}
        <span className="mx-1 hidden w-px self-stretch bg-border-strong sm:block" aria-hidden />
        <CategoryPill
          label="Accepts sBTC"
          icon={Bitcoin}
          count={sbtcCount}
          active={sbtcOnly}
          onClick={() => setSbtcOnly((v) => !v)}
        />
        {session && (
          <CategoryPill
            label="My holdings"
            icon={Wallet}
            count={heldCount}
            active={holdingsOnly}
            onClick={() => setHoldingsOnly((v) => !v)}
          />
        )}
      </div>
      {sbtcOnly && (
        <p className="-mt-1 mb-4 text-xs text-muted-foreground">
          Showing tokens Bitcoin holders can buy directly with sBTC — prices are shown per token in sBTC.
        </p>
      )}
      {holdingsOnly && (
        <p className="-mt-1 mb-4 text-xs text-muted-foreground">
          Showing only listed tokens your connected wallet currently holds a share of.
        </p>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, symbol, or creator address…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-md border border-border-strong p-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={cn("rounded p-1.5 transition-colors", view === "grid" ? "bg-surface-raised text-foreground" : "text-subtle-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className={cn("rounded p-1.5 transition-colors", view === "list" ? "bg-surface-raised text-foreground" : "text-subtle-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="icon" onClick={() => void load(true)} disabled={refreshing} aria-label="Refresh">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      <p className="mb-4 text-xs text-subtle-foreground">
        {filtered.length} token{filtered.length === 1 ? "" : "s"} on Stacks Testnet
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={holdingsOnly ? "You don't hold any listed tokens yet" : "No tokens match your filters"}
          description={holdingsOnly ? "Tokens you purchase will show up here." : "Try a different search term or category."}
        />
      ) : view === "grid" ? (
        <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((token, i) => (
              <motion.div
                key={token.id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03, ease: "easeOut" }}
              >
                <MarketTokenCard token={token} balance={session ? (balances.get(token.id) ?? 0n) : undefined} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div layout className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((token, i) => (
              <motion.div
                key={token.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.02, ease: "easeOut" }}
              >
                <MarketTokenRow token={token} balance={session ? (balances.get(token.id) ?? 0n) : undefined} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function StatTile({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4" title={hint}>
      <p className="font-mono text-lg tabular-nums text-foreground sm:text-xl">{children}</p>
      <p className="mt-0.5 text-[11px] text-subtle-foreground">{label}</p>
    </div>
  );
}

function CategoryPill({
  label,
  icon: Icon,
  count,
  active,
  onClick,
}: {
  label: string;
  icon?: LucideIcon;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary-muted text-primary"
          : "border-border-strong text-muted-foreground hover:text-foreground",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={cn("rounded-full px-1.5 py-px text-[10px]", active ? "bg-primary/20" : "bg-surface-raised")}>{count}</span>
    </motion.button>
  );
}
