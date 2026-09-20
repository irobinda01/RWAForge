# Frontend

Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, Tailwind
CSS v4, Radix UI primitives styled in the shadcn/ui pattern (copied into
`src/components/ui/`, not installed as a package), `sonner` for toasts.

## Design system

One deliberate dark theme (`apps/web/src/app/globals.css`) — not a
light/dark toggle. Background near-black with two lighter surface levels
for cards; warm orange primary accent; emerald/amber/red semantic colors
for success/warning/destructive; a muted blue reserved for "creator
provided, not verified" labeling so it's never confused with the on-chain
verified sections. Monospace (Geist Mono) reserved for wallet addresses,
contract ids, and token symbols.

Domain components live in `src/components/domain/`: `MarketTokenCard`,
`AddressDisplay`, `NetworkIndicator`, `StatusBadge`, `TransactionLink`,
`TransactionStatus`, `EmptyState`, `ConfirmModal`.

## Pages

- `/` — hero, three-step "how it works", a "Why sBTC matters for Bitcoin
  holders" section (`BitcoinHolders`: four benefits, a three-step Bitcoin
  holder path, and the honest caveats — fees are paid in STX, creators set
  prices independently, testnet only), CTA. No fabricated statistics.
- `/create` — token creation form (price in STX, sBTC, or both; leave a
  price empty to not accept that asset) → summary/confirm step →
  wallet-signed `create-token` transaction → success screen with a link to the new
  token, only shown after the transaction actually confirms.
- `/tokens` — live token explorer (`TokensExplorer`), with an "Accepts
  sBTC" filter (`/tokens?asset=sbtc` opens with it on) and an `SbtcBadge`
  on every token that accepts sBTC. Fetched client-side
  from `getAllMarketTokens()` on mount, with a manual refresh button,
  search, and category filter. Renders the spec-mandated empty state
  ("No tokens have been created yet. Be the first creator on RWAForge.")
  when the registry is empty — never demo/placeholder cards.
- `/tokens/[id]` — token detail: an "On-Chain Verified" panel (contract,
    token id, creator, supply, price in each accepted asset, network) and a
  separately labeled "Creator-Provided Information" panel (description,
  category), plus the purchase form. The form offers a "Pay with" selector
  (STX / sBTC) when the token accepts both, checks the buyer's balance of
  the chosen asset, and sends the matching `purchase` or
  `purchase-with-sbtc` call with an exact-amount post-condition.
- `/docs` — in-app summary of scope, an "sBTC & Bitcoin Holders" section, the on-chain/creator-provided split,
  and the testnet faucet link.

## The transaction state machine

Every wallet-signed action goes through
`src/hooks/use-transaction.ts`: `preparing → awaiting-wallet →
broadcasting → confirming → confirmed | failed`. `TransactionStatus`
renders each state in plain language — nowhere does the UI show
`contract-call?`, a raw Clarity error code, or a bare "pending". `confirming`
polls the Hiro API for the transaction's real status
(`packages/stacks/src/confirmation.ts`); nothing is a simulated delay.

## Wallet integration

`packages/stacks/src/wallet.ts` wraps `@stacks/connect` v8 behind a small
interface (`connect`, `disconnect`, `getStoredSession`, `signContractCall`)
so the rest of the app never imports `@stacks/connect` directly.
`WalletProvider` is a thin React context around that wrapper; `useWallet()`
is how every component reads the connected session. No transaction is ever
signed without the wallet's own confirmation UI.

## Data fetching — blockchain is the only source of truth

There is no database and no `/api/*` route in this app. `/tokens` and
`/tokens/[id]` fetch directly from `@rwaforge/stacks`'s read functions
(`getAllMarketTokens`, `getMarketToken`, `getMarketBalance`), which call
the Hiro Stacks API's read-only-function endpoint. After a create or
purchase transaction confirms, the relevant page re-runs the same fetch —
no local state is ever treated as if the transaction already happened
before the chain confirms it.

## Accessibility & responsiveness

Radix primitives provide keyboard navigation, focus management, and ARIA
wiring for dialogs/selects/tooltips out of the box. Card grids collapse to
a single column below `sm`; the create/purchase forms are single-column
and work unmodified on mobile widths.
