# RWAForge

**A minimal, real, working Stacks Testnet MVP for creating and purchasing
on-chain tokens.**

RWAForge does exactly two things, both on the **Stacks Testnet**, both real
wallet-signed transactions:

1. **Create** a token — name, symbol, description, category, total supply,
   price per token.
2. **Purchase** an available token with real testnet STX, at the price its
   creator set.

> RWAForge MVP currently provides testnet token creation and purchasing
> infrastructure. Token creation does not by itself establish legal
> ownership of an underlying real-world asset.

Nothing else. No secondary marketplace, no staking or lending, no KYC, no
fiat on/off-ramp, no admin dashboard, no fake data. See
[docs/ROADMAP.md](docs/ROADMAP.md) for the full list of what's
intentionally out of scope, and why.

## Architecture at a glance

```
apps/web/            Next.js app: home, /create, /tokens, /tokens/[id] — no database, no /api routes
contracts/            Clarinet project: token-market.clar (the MVP contract) + tests
packages/types/        Shared TypeScript domain types
packages/stacks/        Stacks.js integration: reads, writes, wallet, network config
docs/                  Architecture, contracts, frontend, security, deployment, roadmap
```

The blockchain is the **only** source of truth. There is no off-chain
database, no API route, and no cached copy of any token's state anywhere
in this app — every page reads directly from `token-market.clar` via the
Hiro Stacks API, and every create/purchase action is a wallet-signed
transaction the user explicitly approves.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full breakdown
and [docs/SMART-CONTRACTS.md](docs/SMART-CONTRACTS.md) for exactly how
`token-market.clar` works, including its ownership model and atomicity
guarantees.

**Note:** this repository also contains five additional Clarity contracts
(`rwa-registry`, `compliance-registry`, `document-registry`,
`protocol-admin`, `rwa-token`) from an earlier, broader version of this
project. They're kept, unused, tested, and `clarinet check`-clean, but the
current frontend never deploys, calls, or reads them — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#whats-dormant-in-this-repo).

## Smart contract: `token-market.clar`

One Clarity 3 contract holds every token created through RWAForge, keyed
by a numeric `token-id`, rather than deploying a fresh contract per token:

- **`create-token`** — anyone can call this (self-service by design). The
  caller becomes the token's `creator`, and the entire `total-supply` is
  credited to their own balance for that token-id.
- **`purchase`** — buys `amount` tokens from a token's creator. Computes
  `cost = amount × price`, transfers that STX from buyer to creator, and
  moves `amount` tokens from creator to buyer — atomically. If the STX
  transfer fails (e.g. insufficient balance), the whole transaction
  reverts and **no** balance changes; there's no code path where a buyer
  pays without receiving tokens, or receives tokens without paying.
- **No general `transfer`.** Balances only ever change via creation and
  purchase, matching RWAForge's two supported features exactly.
- **No admin, no escrow, no protocol fee.** STX moves directly
  buyer → creator; there is no privileged account of any kind in this
  contract.

Full design rationale, error codes, and the ownership-model explanation
are in [docs/SMART-CONTRACTS.md](docs/SMART-CONTRACTS.md).

## Local setup

Requirements: Node.js 20+, npm, and [Clarinet](https://docs.hiro.so/clarinet) 3.x.

```bash
git clone <this-repo>
cd RWAForge
npm install
```

### Smart contracts (Clarinet)

```bash
cd contracts
clarinet check      # static analysis
npm test            # 21 tests for token-market.clar (+ 72 legacy tests for the dormant contracts) via the Clarinet JS SDK + Vitest
```

### Frontend

```bash
cd apps/web
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without `NEXT_PUBLIC_MARKET_CONTRACT_ID` set,
the app runs, but `/tokens` and `/tokens/[id]` show a clear "not
configured" message instead of crashing or showing placeholder data —
there is no demo-data fallback anywhere in this MVP.

### Environment variables

See [apps/web/.env.example](apps/web/.env.example).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_STACKS_NETWORK` | `testnet` (default), `mainnet`, or `devnet`. |
| `NEXT_PUBLIC_STACKS_API_URL` | Hiro Stacks API base URL. Defaults to the public testnet API. |
| `NEXT_PUBLIC_MARKET_CONTRACT_ID` | The deployed `token-market` contract, as `ADDRESS.token-market`. |
| `NEXT_PUBLIC_APP_URL` | Your app's own URL (used for metadata only). |

## Deploying `token-market.clar` to Stacks Testnet

Full step-by-step instructions — including how to trim the generated
deployment plan down to just `token-market` — are in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Summary:

```bash
cd contracts
# put a testnet-only mnemonic in settings/Testnet.toml (gitignored)
clarinet deployments generate --testnet --medium-cost
# edit deployments/default.testnet-plan.yaml down to just the token-market entry
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

Then set `NEXT_PUBLIC_MARKET_CONTRACT_ID=<your-address>.token-market` in
`apps/web/.env.local`.

RWAForge's own tooling never asks for or transmits your mnemonic/private
key — `settings/Testnet.toml` is gitignored specifically so you can put a
real testnet-only mnemonic there without risk of committing it, and
Clarinet signs and broadcasts locally on your machine.

## Getting testnet STX

You need Stacks **Testnet** STX, not real STX — nothing in this app costs
real money. Get some from the
[Hiro Stacks Testnet faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet),
and make sure your wallet (Leather or Xverse) is switched to **Testnet**.

## How to create a token

1. Connect your Testnet wallet (top-right **Connect Wallet**).
2. Go to `/create`, fill in name, symbol, description, category, total
   supply, and price per token.
3. Review the summary and click **Confirm & Create Token** — your wallet
   prompts you to sign a `create-token` transaction.
4. Once it confirms, you land on a success screen with a link to the
   transaction on the Stacks Testnet explorer and a link to your new
   token's page.

## How to purchase a token

1. Browse `/tokens` (or open a token's own link) and click into one with
   available supply.
2. Connect your wallet if you haven't, enter a quantity — the total STX
   cost is computed live (`amount × price`).
3. Click **Purchase Tokens** and confirm in your wallet. RWAForge checks
   your STX balance against the cost before prompting the wallet, so an
   obviously-doomed transaction never reaches it.
4. Once confirmed, the page re-fetches the token's available supply and
   your balance directly from the contract — no page refresh needed.

## Verifying transactions

Every create and purchase flow shows a link to the transaction on the
[Stacks Testnet explorer](https://explorer.hiro.so) as soon as it
broadcasts. Token pages also link the `token-market` contract address
itself, so anyone can independently confirm a token's supply, price, and
balances against the chain without trusting RWAForge's frontend at all.

## Testing

- **Contracts**: `contracts/tests/token-market.test.ts`, run with
  `npm test` inside `contracts/` (Clarinet JS SDK + Vitest). Covers valid
  creation, invalid supply/price/name/symbol/category, valid purchase
  (including asserting the STX balance actually moves), insufficient
  supply, invalid amount, self-purchase, selling out, multiple buyers, and
  multiple tokens across multiple creators.
- **Frontend**: `apps/web` — `npm run typecheck`, `npm run lint`,
  `npm test`.

## Known MVP limitations

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full list — in short: one
shared contract instead of one per token, no resale/transfer after
purchase, no escrow or protocol fee, no pagination on the token list, and
STX balance checks that don't account for exact network fees.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/SMART-CONTRACTS.md](docs/SMART-CONTRACTS.md)
- [docs/FRONTEND.md](docs/FRONTEND.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
