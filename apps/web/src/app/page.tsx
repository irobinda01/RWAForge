"use client";

import Link from "next/link";
import { ArrowRight, Coins, ShieldCheck, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContractCard } from "@/components/domain/contract-card";
import { RoadmapItemRow } from "@/components/domain/roadmap-item-row";
import { PROTOCOL_CONTRACTS, ROADMAP_ITEMS } from "@/lib/protocol";
import { LiveStat } from "./live-stat";

const dormantCount = PROTOCOL_CONTRACTS.filter((c) => c.status === "dormant").length;

const STEPS = [
  {
    icon: Wallet,
    title: "1. Connect a Stacks wallet",
    description: "Leather or Xverse, set to Stacks Testnet. No wallet, no transactions — RWAForge never signs on your behalf.",
  },
  {
    icon: Coins,
    title: "2. Create or purchase a token",
    description: "Deploy a token with a name, supply, and price, or buy into one that's already live — each is a single real testnet transaction.",
  },
  {
    icon: ShieldCheck,
    title: "3. Verify it yourself",
    description: "Every token, transfer, and balance is on-chain. Check any transaction on the Stacks Testnet explorer, independent of RWAForge.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="show"
            transition={{ staggerChildren: 0.09, delayChildren: 0.05 }}
          >
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
              </span>
              Stacks Testnet — no real funds are used
            </motion.span>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-balance mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl"
            >
              Tokenize Real-World Infrastructure on Stacks.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-balance mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Create on-chain tokens and purchase tokenized assets using Stacks Testnet.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button asChild size="lg" className="group">
                <Link href="/create">
                  Create Token{" "}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tokens">Explore Tokens</Link>
              </Button>
            </motion.div>
            <motion.div variants={fadeUp} transition={{ duration: 0.6, ease: "easeOut" }} className="mt-8 flex justify-center">
              <LiveStat />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Two things, done for real
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            RWAForge does exactly two things on Stacks Testnet: create a token, and buy a token
            with testnet STX. Every action is a real, wallet-signed transaction you can verify on
            the explorer — nothing here is simulated.
          </p>
        </motion.div>
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
            >
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(247,147,26,0.15),0_20px_40px_-20px_rgba(0,0,0,0.6)]">
                <CardContent className="p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted transition-transform duration-300 group-hover:scale-110">
                    <step.icon className="h-5 w-5 text-primary" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              Built for a bigger protocol
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              One contract live. {dormantCount} more waiting.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              The MVP ships exactly two features on one contract, <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">token-market.clar</code>.
              But RWAForge carries a broader protocol design underneath: {dormantCount} additional
              Clarity contracts — a compliance registry, a document integrity registry, a richer asset
              registry, and more — already written, tested, and passing <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground">clarinet check</code>,
              simply not deployed yet. Explore what runs today and what&apos;s reference infrastructure
              for what&apos;s next.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PROTOCOL_CONTRACTS.map((c) => (
              <ContractCard key={c.file} contract={c} defaultOpen={c.status === "live"} />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-14"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-foreground">What&apos;s next</h3>
              <Link href="/docs#roadmap" className="text-sm font-medium text-primary hover:underline">
                Full roadmap →
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROADMAP_ITEMS.slice(0, 4).map((item) => (
                <RoadmapItemRow key={item.label} item={item} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-border-strong bg-card px-8 py-10 text-center sm:flex-row sm:text-left"
          >
            <div>
              <h3 className="text-xl font-semibold text-foreground">Ready to forge your first token?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect a Stacks Testnet wallet and create a token in minutes. Need testnet STX
                first? See the faucet link in the docs.
              </p>
            </div>
            <Button asChild size="lg" className="group shrink-0">
              <Link href="/create">
                Create Token{" "}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
