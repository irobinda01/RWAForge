"use client";

import Link from "next/link";
import { ArrowRight, Bitcoin, Fuel, Link2, ShieldCheck, Target, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Benefit {
  icon: LucideIcon;
  title: string;
  body: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: Bitcoin,
    title: "Stay in Bitcoin",
    body: "sBTC is backed 1:1 by real BTC. Buy a token with it and you never have to convert your holdings into a separate, volatile asset just to take part.",
  },
  {
    icon: Target,
    title: "See the price in sats",
    body: "Creators can price a token directly in sBTC, so a Bitcoin holder sees the cost in Bitcoin terms — not a moving STX exchange rate.",
  },
  {
    icon: ShieldCheck,
    title: "Anchored to Bitcoin",
    body: "Stacks transactions settle on Bitcoin, and sBTC is redeemable for BTC. Real-world asset tokens meet Bitcoin's security instead of asking you to leave it.",
  },
  {
    icon: Link2,
    title: "Direct, atomic, no middleman",
    body: "Your sBTC goes straight to the creator in the same transaction that delivers your tokens. No escrow, no custodian, no protocol fee — and if either side fails, neither happens.",
  },
];

const JOURNEY = [
  {
    step: "1",
    title: "Bring BTC to Stacks as sBTC",
    body: "Deposit BTC through the sBTC bridge and receive the same amount of sBTC. On testnet, grab free test sBTC from the Hiro faucet.",
  },
  {
    step: "2",
    title: "Pick a token that accepts sBTC",
    body: "Look for the sBTC badge, or filter the explorer to “Accepts sBTC”. Each shows its price per token in sBTC.",
  },
  {
    step: "3",
    title: "Pay in sBTC, receive tokens",
    body: "Your wallet shows the exact sBTC leaving your account. The tokens arrive in the same transaction.",
  },
];

/**
 * Homepage section explaining why sBTC matters for Bitcoin holders. Every
 * claim here mirrors what token-market.clar actually does (docs/SMART-CONTRACTS.md)
 * — including the caveats at the bottom, which are deliberately not hidden.
 */
export function BitcoinHolders() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[720px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[110px]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-muted px-3 py-1 text-xs font-medium text-primary">
            <Bitcoin className="h-3.5 w-3.5" aria-hidden />
            sBTC · Bitcoin on Stacks
          </span>
          <h2 className="text-balance mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Real-world assets, open to Bitcoin holders
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Most Bitcoin sits in wallets that can&apos;t touch smart contracts. sBTC brings it to Stacks, and
            RWAForge accepts it directly — so a token&apos;s buyers aren&apos;t limited to people who already
            hold STX. That widens who can invest in a token, and who a creator can sell to.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
            >
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                <CardContent className="p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted transition-transform duration-300 group-hover:scale-110">
                    <b.icon className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h3 className="text-center text-lg font-semibold text-foreground">A Bitcoin holder&apos;s path, in three steps</h3>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {JOURNEY.map((j, i) => (
              <li key={j.step} className="relative rounded-xl border border-border bg-card p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {j.step}
                </span>
                <h4 className="mt-3 text-sm font-semibold text-foreground">{j.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{j.body}</p>
                {i < JOURNEY.length - 1 && (
                  <ArrowRight
                    aria-hidden
                    className="absolute -right-3.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background text-primary md:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.div
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-2 rounded-xl border border-border bg-surface/60 p-5 text-xs leading-relaxed text-muted-foreground"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="flex items-start gap-2">
            <Fuel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              <strong className="text-foreground">Fees are still paid in STX.</strong> Paying for a token in sBTC
              means you don&apos;t need STX to buy it, but every Stacks transaction needs a small amount of STX
              for the network fee.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              <strong className="text-foreground">Creators set each price themselves.</strong> RWAForge doesn&apos;t
              convert between STX and BTC, so an sBTC price is exactly what the creator entered.
            </span>
          </p>
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              <strong className="text-foreground">This is a testnet MVP.</strong> Test sBTC has no real value, and
              nothing here has been audited for mainnet.
            </span>
          </p>
        </motion.div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="group">
            <Link href="/tokens?asset=sbtc">
              Browse sBTC tokens{" "}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/docs#bitcoin">How sBTC works here</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
