# Roadmap

## Explicitly out of scope for this MVP

RWAForge does exactly two things: create a token, and purchase a token
with testnet STX or sBTC. None of the following are implemented, by design, per
the project's scope discipline:

- Secondary marketplace / secondary trading
- Token swapping, lending, staking, or yield
- DAO governance, dividends, or token redemption
- KYC or any identity/compliance verification
- Fiat payment gateways or on/off-ramps
- Mainnet deployment
- Cross-chain or multi-chain functionality
- NFT functionality
- Investor dashboards, portfolio analytics, or price/trading charts
- Referral or social features, notifications
- An admin dashboard or any privileged/admin role in the contract
- Artificial marketplace activity, fake transactions, or hardcoded demo
  tokens — every token shown in the app is read live from
  `token-market.clar`

## Known MVP simplifications (and what replaces them later)

- **One shared contract, not one deployed per token.** `token-market.clar`
  holds every token's metadata and balances in maps rather than deploying
  a fresh SIP-010 contract per token. This is fast and cheap to create a
  token with (one signature, not three), but means a token isn't
  independently SIP-010-compliant or individually indexable by
  wallets/explorers that expect one fungible-token contract per asset. A
  later version could reintroduce the per-token-deployed-contract pattern
  the dormant `rwa-token.clar` template already implements (see
  [SMART-CONTRACTS.md](./SMART-CONTRACTS.md)) once the product needs
  wallet-native token display.
- **No general transfer function.** Balances only change via creation and
  purchase — a buyer can't resell or send their tokens elsewhere in this
  MVP. Adding SIP-010-style `transfer` is straightforward once secondary
  transfer is actually in scope.
- **No escrow, no protocol fee.** STX or sBTC goes directly from buyer to
  creator.
- **No price oracle or conversion.** A creator sets an STX price and an
  sBTC price independently (either may be left off). RWAForge doesn't
  convert between them or track the STX/BTC rate, so the two prices can
  drift apart as markets move, and a price can't be edited after creation.
- **sBTC contract is hardcoded per network.** `purchase-with-sbtc` calls a
  literal sBTC contract principal (testnet today), so a mainnet build needs
  that literal swapped before deploying — see
  [DEPLOYMENT.md](./DEPLOYMENT.md#mainnet).
  A future version charging a protocol fee would need a fee-collection
  step and a decision about who's authorized to withdraw it — that's a
  privileged role this MVP deliberately doesn't have yet.
- **No pagination on `/tokens`.** `get-token(i)` for `i` in `0..count-1` is
  fine at MVP scale; a real indexer/API layer would add pagination before
  the token count gets large.
- **Data fetching is plain `useEffect`/`useState`**, not a cache/query
  library — see the comment in `eslint.config.mjs` downgrading
  `react-hooks/set-state-in-effect`. TanStack Query or SWR would add
  request deduplication and background refetching.
- **Balance pre-checks don't account for network fees precisely** —
  the purchase form warns on insufficient STX or sBTC for the purchase
  price itself (network fees are always paid in STX, even for an sBTC
  purchase), but doesn't fetch a live fee estimate, per the spec's "don't
  guarantee exact fee values" guidance.

## Dormant infrastructure available for a future version

Five contracts from an earlier, broader version of this project remain in
`contracts/` (see [ARCHITECTURE.md](./ARCHITECTURE.md) "What's dormant in
this repo"), tested and `clarinet check`-clean but unused by the current
frontend:

- **`compliance-registry.clar`** — per-asset, per-wallet investor
  eligibility (whitelisted/suspended/class/expiry). Reusable if RWAForge
  later needs restricted/accredited-investor-only tokens.
- **`document-registry.clar`** — on-chain content-hash proof-of-existence
  for off-chain documents (disclosures, valuations). Reusable for asset
  documentation once that's back in scope.
- **`protocol-admin.clar`** — a minimal role registry and emergency
  transfer-pause circuit breaker, deliberately unable to move funds, mint,
  or burn on any user's behalf.
- **`rwa-registry.clar`** — a richer per-asset registry (jurisdiction,
  protocol-controlled verification status) than `token-market`'s flat
  token record.
- **`rwa-token.clar`** — a SIP-010 template meant to be deployed once per
  asset, with issuer-gated mint/burn/pause and compliance-checked
  transfers, plus the template-rewriting pattern in
  `packages/stacks` history for resolving cross-contract references when
  an issuer deploys it from their own wallet.

None of these are wired into the current create/purchase flow. Building
any of them back in is additive, not a rewrite — `token-market.clar` would
gain a `compliance-registry` check inside a future `transfer`, or a
project could add a real per-asset legal/document layer using
`document-registry` without touching `create-token`/`purchase`.
