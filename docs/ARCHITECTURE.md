# RWAForge Architecture

## Overview

RWAForge's MVP has two layers, both intentionally minimal:

1. **On-chain (Clarity / Stacks)** — `token-market.clar` is the sole source
   of truth for every token's metadata, supply, and balances. See
   [SMART-CONTRACTS.md](./SMART-CONTRACTS.md).
2. **Frontend (Next.js App Router)** — create-token form, token explorer,
   and token detail/purchase page. See [FRONTEND.md](./FRONTEND.md).

There is no off-chain database and no server-side persistence layer. Every
read in the app is a live call to `token-market.clar` (via the Hiro Stacks
API); every write is a wallet-signed transaction the user explicitly
approves. Nothing is cached, indexed, or duplicated off-chain.

```
apps/web/            Next.js app: home, /create, /tokens, /tokens/[id]
contracts/            Clarinet project: token-market.clar (+ tests)
packages/types/        Shared TypeScript domain types
packages/stacks/        Stacks.js integration: reads, writes, wallet, network config
docs/                  This documentation set
```

## Why a monorepo with two small packages instead of one app?

- **`@rwaforge/types`** defines `MarketToken`, the on-chain shape both the
  frontend and any future tooling (a CLI, a background indexer) would need
  to agree on.
- **`@rwaforge/stacks`** wraps every contract read/write
  (`buildCreateTokenTx`, `buildPurchaseTx`, `getMarketToken`,
  `getAllMarketTokens`, `getMarketBalance`) and the wallet integration
  (`@stacks/connect`) behind a small typed surface, so nothing else in the
  app imports `@stacks/transactions` or `@stacks/connect` directly.

## Why a single shared contract instead of one deployed per token

Clarity has no runtime contract factory (no `CREATE2`-style dynamic
deployment) — a contract that wants to hold multiple independent fungible
assets either deploys a fresh copy of a token template per asset (three
wallet signatures: deploy, initialize, link), or holds every asset's
balances in maps inside one contract. RWAForge's MVP takes the second path:
`token-market.clar` stores every created token's metadata in a `tokens`
map keyed by an auto-incrementing `token-id`, and every balance in a
`balances` map keyed by `{token-id, owner}`. Creating a token is a single
contract-call transaction (one wallet signature), and a token's identity is
the pair `(token-market contract id, token-id)` rather than its own
contract address — see "Token identity" in
[SMART-CONTRACTS.md](./SMART-CONTRACTS.md).

This is a deliberate scope choice for the MVP's two features (create,
purchase), not a limitation nobody considered — see
[ROADMAP.md](./ROADMAP.md) for what a later per-asset-contract model would
add.

## Request flow for a state-changing action (example: purchasing)

1. User enters a quantity on `/tokens/[id]` and clicks **Purchase Tokens**.
2. The frontend computes the STX cost client-side (`amount × price`) and
   checks the connected wallet's STX balance via the Hiro API before
   prompting the wallet, so an obviously-doomed transaction never reaches
   the wallet.
3. `useTransaction` (`apps/web/src/hooks/use-transaction.ts`) builds the
   unsigned call via `buildPurchaseTx` and hands it to `@stacks/connect`'s
   `request()`, which prompts the connected wallet (Leather/Xverse).
4. The same hook drives the UI through `preparing → awaiting-wallet →
   broadcasting → confirming → confirmed | failed` (see
   [FRONTEND.md](./FRONTEND.md)), polling the Hiro API for the real
   transaction status — no simulated delays.
5. On confirmation, the token detail page re-fetches `get-token` and
   `get-balance` directly from the contract and re-renders with the new
   available supply and buyer balance.

No server-side code ever signs or authorizes a transaction on a user's
behalf, and no API route exists that could — see
[SECURITY.md](./SECURITY.md).

## What's dormant in this repo

Five additional Clarity contracts
(`rwa-registry`, `compliance-registry`, `document-registry`,
`protocol-admin`, `rwa-token`) and their 72 tests remain in
`contracts/contracts/` and `contracts/tests/` from an earlier, broader
version of this project that targeted a compliance-gated issuance
platform rather than a create/purchase MVP. They still pass `clarinet
check` and their full test suite, but **nothing in the current frontend
deploys, calls, or reads them** — the MVP intentionally does not build a
whitelist/KYC/document-verification product surface. They're kept, unused,
rather than deleted, in case a future version needs that infrastructure
again; see [ROADMAP.md](./ROADMAP.md).
