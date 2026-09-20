"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractCard } from "@/components/domain/contract-card";
import { RoadmapItemRow } from "@/components/domain/roadmap-item-row";
import { useActiveSection } from "@/hooks/use-active-section";
import { PROTOCOL_CONTRACTS, ROADMAP_ITEMS } from "@/lib/protocol";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "bitcoin", label: "sBTC & Bitcoin Holders" },
  { id: "data-model", label: "On-Chain vs Creator-Provided" },
  { id: "contracts", label: "Smart Contracts" },
  { id: "architecture", label: "Architecture" },
  { id: "security", label: "Security" },
  { id: "roadmap", label: "Roadmap" },
  { id: "testnet", label: "Testnet STX & sBTC" },
];

const liveCount = PROTOCOL_CONTRACTS.filter((c) => c.status === "live").length;
const dormantCount = PROTOCOL_CONTRACTS.length - liveCount;

export function DocsContent() {
  const activeId = useActiveSection(SECTIONS.map((s) => s.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Documentation</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          RWAForge is a protocol for tokenizing real-world infrastructure on Stacks. Today, exactly one
          contract is live and two features work end-to-end: creating a token and buying one. The
          protocol is designed for more than that — this page covers the full picture, live and dormant.
        </p>
      </div>

      {/* Mobile: horizontal scrollable pill nav */}
      <nav className="sticky top-16 z-30 -mx-4 mb-8 overflow-x-auto border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex w-max gap-1.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeId === s.id
                  ? "border-primary/40 bg-primary-muted text-primary"
                  : "border-border-strong text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[200px_1fr]">
        {/* Desktop: sticky sidebar nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeId === s.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {activeId === s.id && (
                  <motion.span
                    layoutId="docs-toc-active"
                    className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="pl-3">{s.label}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-16">
          <section id="overview" className="scroll-mt-24">
            <SectionHeading title="Overview" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard value="1" label="Contract live" tone="success" />
              <StatCard value={String(dormantCount)} label="Contracts dormant, tested, ready" tone="default" />
              <StatCard value="2" label="Features shipped: create, purchase" tone="success" />
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              RWAForge&apos;s MVP intentionally does exactly two things:{" "}
              <strong className="text-foreground">create</strong> a token and{" "}
              <strong className="text-foreground">purchase</strong> one with testnet STX or sBTC, both real,
              wallet-signed, on-chain transactions. But the codebase carries a broader protocol vision
              from an earlier design pass: a compliance-gated issuance platform with per-asset registries,
              investor whitelisting, and document integrity. Those five contracts are still in the repo —
              written, tested, passing <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">clarinet check</code> —
              but not deployed or called by the app today. This page is honest about that split: what
              runs, and what&apos;s reference infrastructure for later.
            </p>
          </section>

          <section id="bitcoin" className="scroll-mt-24">
            <SectionHeading title="sBTC & Bitcoin Holders" />
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              Most Bitcoin sits in wallets that can&apos;t interact with smart contracts. sBTC is Bitcoin on
              Stacks: a token backed 1:1 by BTC and redeemable for it. RWAForge lets a token&apos;s creator
              price it in sBTC, so Bitcoin holders can buy real-world-asset tokens directly, without first
              converting their holdings into another asset.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>For Bitcoin holders</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                    <li>Pay in sBTC and see prices in sats terms, not a moving STX exchange rate.</li>
                    <li>Your sBTC goes straight to the creator in the same transaction that delivers your tokens — no escrow, no custodian, no protocol fee.</li>
                    <li>The wallet shows the exact amount leaving your account, and the transaction aborts if the contract tried to move anything else.</li>
                    <li>Look for the sBTC badge, or use the &quot;Accepts sBTC&quot; filter on the tokens page.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>For token creators</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                    <li>Price a token in STX, sBTC, or both. Add an sBTC price to open it to Bitcoin holders.</li>
                    <li>You receive the payment directly in your own wallet, in the asset the buyer chose.</li>
                    <li>A price of zero means that asset isn&apos;t accepted; at least one price is required.</li>
                    <li>Prices are fixed at creation and can&apos;t be changed afterwards.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Honest caveats</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <ul className="flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-warning">
                  <li>
                    <strong className="text-foreground">Fees are paid in STX.</strong> Buying with sBTC means you
                    don&apos;t need STX to pay for the token, but every Stacks transaction still needs a small
                    amount of STX for the network fee.
                  </li>
                  <li>
                    <strong className="text-foreground">No conversion or oracle.</strong> The STX and sBTC prices
                    are independent and set by the creator; RWAForge doesn&apos;t track the STX/BTC rate, so they
                    can drift apart.
                  </li>
                  <li>
                    <strong className="text-foreground">sBTC has its own risks.</strong> RWAForge&apos;s contract
                    only calls the sBTC token; it doesn&apos;t audit or control sBTC itself.
                  </li>
                  <li>
                    <strong className="text-foreground">Testnet only.</strong> Test sBTC has no real value, and
                    this MVP has not been audited for mainnet.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="data-model" className="scroll-mt-24">
            <SectionHeading title="On-Chain vs. Creator-Provided" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Every token page separates two kinds of data.{" "}
              <strong className="text-foreground">On-chain verified</strong> fields — contract, token id,
              creator address, total/available supply, price, purchase transactions — are read directly
              from the Stacks blockchain and independently verifiable by anyone.{" "}
              <strong className="text-accent-blue">Creator-provided information</strong> — description and
              category — is supplied by the token&apos;s creator and stored on-chain verbatim, but RWAForge
              does not independently verify that a token represents the real-world asset it claims to.
              This split is a product principle, not just a UI label: it&apos;s also why the dormant{" "}
              <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">rwa-registry.clar</code>{" "}
              keeps verification status protocol-controlled rather than issuer-settable.
            </p>
          </section>

          <section id="contracts" className="scroll-mt-24">
            <SectionHeading title="Smart Contracts" />
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              Seven Clarity contracts live in <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">contracts/contracts/</code>.
              One is live. Click any card for details, including the exact functions it exposes.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PROTOCOL_CONTRACTS.map((c) => (
                <ContractCard key={c.file} contract={c} defaultOpen={c.status === "live"} />
              ))}
            </div>
          </section>

          <section id="architecture" className="scroll-mt-24">
            <SectionHeading title="Architecture" />
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Two layers, one source of truth</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground">
                  On-chain (Clarity/Stacks) is the sole source of truth for every token&apos;s metadata,
                  supply, and balances. The frontend (Next.js) has no database and no server-side
                  persistence layer — every read is a live call to <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">token-market.clar</code> via
                  the Hiro Stacks API, and every write is a wallet-signed transaction the user explicitly
                  approves. Nothing is cached, indexed, or duplicated off-chain.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Why one shared contract, not one deployed per token</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground">
                  Clarity has no runtime contract factory — no <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">CREATE2</code>-style
                  dynamic deployment. A contract that wants to hold multiple independent fungible assets
                  either deploys a fresh template per asset (three wallet signatures: deploy, initialize,
                  link — the dormant <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">rwa-token.clar</code> path),
                  or holds every asset&apos;s balances in maps inside one contract. The MVP takes the
                  second path deliberately: creating a token is a single signature, and a token&apos;s
                  identity is the pair (token-market contract, token-id) rather than its own address.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Request flow — purchasing a token</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
                    {[
                      "User enters a quantity on the token page and clicks Purchase Tokens.",
                      "The buyer picks STX or sBTC (whichever the token accepts). The frontend computes the cost client-side (amount × price in that asset) and checks the connected wallet's balance of it before prompting the wallet.",
                      "useTransaction builds the unsigned call and hands it to @stacks/connect, which prompts the wallet (Leather/Xverse).",
                      "The UI walks through preparing → awaiting-wallet → broadcasting → confirming → confirmed | failed, polling the Hiro API for the real status.",
                      "On confirmation, the page re-fetches get-token and get-balance directly from the contract and re-renders.",
                    ].map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[11px] font-semibold text-foreground">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="security" className="scroll-mt-24">
            <SectionHeading title="Security" />
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Atomicity, concretely</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground">
                  A Clarity public function that returns an error at the top level has zero state changes
                  applied — a VM-level guarantee, not something the contract author implements manually.{" "}
                  <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">purchase</code> relies on this directly: every check runs before any
                  balance mutation, so a failure at any point — token not found, invalid amount,
                  self-purchase, insufficient supply, an unaccepted payment asset, or a failed STX or sBTC transfer — leaves every map exactly
                  as it was. The 32 tests in <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">token-market.test.ts</code> include
                  explicit before/after STX and sBTC balance assertions proving the payment actually moves on a
                  successful call.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>No admin, no backdoor</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground">
                  Unlike the dormant <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">protocol-admin.clar</code> /{" "}
                  <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">rwa-token.clar</code> pair, which had an
                  emergency pause and issuer mint/burn, <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">token-market.clar</code> has
                  no privileged account of any kind — no <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">set-*-admin</code>, no pause
                  switch, no fee. STX or sBTC only ever moves buyer → creator, for the exact amount computed from
                  on-chain state.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Frontend trust boundaries</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-sm leading-relaxed text-muted-foreground">
                  There is no server-side signing and no API route at all — every mutating action is built
                  as an unsigned transaction and handed to the user&apos;s own wallet extension. All state
                  is re-read from the chain after a transaction confirms, never inferred or optimistically
                  patched. Balance pre-checks in the purchase form are advisory only; the contract&apos;s
                  own transfer call is the real enforcement point.
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="roadmap" className="scroll-mt-24">
            <SectionHeading title="Roadmap" />
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
              Two kinds of &quot;not yet&quot;: features backed by dormant, tested infrastructure already
              sitting in this repo, and features that haven&apos;t been started at all.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROADMAP_ITEMS.map((item) => (
                <RoadmapItemRow key={item.label} item={item} />
              ))}
            </div>
          </section>

          <section id="testnet" className="scroll-mt-24">
            <SectionHeading title="Getting Testnet STX & sBTC" />
            <Card>
              <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
                You need Stacks <strong className="text-foreground">Testnet</strong> STX, not real STX, to
                create or purchase tokens here — nothing on this site costs real money. Get testnet STX
                from the{" "}
                <a
                  href="https://explorer.hiro.so/sandbox/faucet?chain=testnet"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Hiro Stacks Testnet faucet
                </a>
                , and make sure your wallet (Leather or Xverse) is switched to Testnet.
              </CardContent>
            </Card>
            <Card className="mt-4 border-warning/30 bg-warning-muted">
              <CardContent className="p-5 text-sm leading-relaxed text-foreground">
                RWAForge MVP provides testnet token creation and purchasing infrastructure. Token creation
                does not by itself establish legal ownership of an underlying real-world asset.
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-5 text-xl font-semibold tracking-tight text-foreground">{title}</h2>;
}

function StatCard({ value, label, tone }: { value: string; label: string; tone: "success" | "default" }) {
  return (
    <Card className={cn(tone === "success" && "border-success/25")}>
      <CardContent className="p-5">
        <p className={cn("text-2xl font-semibold tabular-nums", tone === "success" ? "text-success" : "text-foreground")}>
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
