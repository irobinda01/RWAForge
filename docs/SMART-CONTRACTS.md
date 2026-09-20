# Smart Contracts

## `token-market.clar`

The entire MVP on-chain surface. One Clarity 3 contract, in
`contracts/contracts/token-market.clar`, covered by 32 tests in
`contracts/tests/token-market.test.ts` (`clarinet check` + `npm test`
inside `contracts/`).

### Token identity

A token is not its own deployed contract. It's a row in the `tokens` map,
keyed by an auto-incrementing `uint` `token-id`, inside the one deployed
`token-market` contract. A token's globally unique on-chain identity is
therefore the pair **(token-market contract principal, token-id)** — e.g.
`ST2....token-market` + `#7` — which the frontend displays together on
every token page and uses as the route param (`/tokens/7`). See
"Why a single shared contract instead of one deployed per token" in
[ARCHITECTURE.md](./ARCHITECTURE.md) for why.

### State

```clarity
(define-map tokens
  uint
  {
    creator: principal,
    name: (string-ascii 64),
    symbol: (string-ascii 10),
    description: (string-utf8 500),
    category: (string-ascii 20),
    total-supply: uint,
    available-supply: uint,
        price-stx: uint, ;; micro-STX per whole token; u0 = STX not accepted
    price-sbtc: uint, ;; sats (1e-8 sBTC) per whole token; u0 = sBTC not accepted

    created-at: uint
  })

(define-map balances {token-id: uint, owner: principal} uint)
```

`description` and `category` are the creator's own claims, stored on-chain
verbatim but never independently verified by RWAForge — the frontend
labels them "Creator-Provided Information", distinct from every other
field, which is directly on-chain-verifiable. See spec principle in
[ARCHITECTURE.md](./ARCHITECTURE.md) and the token detail page's two-panel
layout.

### `create-token`

```clarity
(define-public (create-token
    (name (string-ascii 64)) (symbol (string-ascii 10))
    (description (string-utf8 500)) (category (string-ascii 20))
    (total-supply uint) (price-stx uint) (price-sbtc uint))
  ...)
```

Validates non-empty `name`/`symbol`/`category`, non-zero `total-supply`, and
that at least one of `price-stx` / `price-sbtc` is non-zero
(`ERR-INVALID-INPUT` / `ERR-INVALID-AMOUNT`). A price of `u0` means that
asset is not accepted, so a token can be priced in STX only, sBTC only, or
both — the creator decides, and a Bitcoin holder can buy any token that
accepts sBTC without swapping into STX first. Then it
assigns the next `token-id`, and credits the **entire** `total-supply` to
`tx-sender`'s balance for that token-id. `tx-sender` becomes the token's
`creator` — never a client-supplied field. Returns `(ok token-id)` so the
frontend can read the assigned id straight from the confirmed
transaction's result, not by inferring it from "current count - 1" (which
would race against another creator's transaction in the same block).

### `purchase` and `purchase-with-sbtc`

```clarity
(define-public (purchase (token-id uint) (amount uint)) ...)            ;; pay in STX
(define-public (purchase-with-sbtc (token-id uint) (amount uint)) ...)  ;; pay in sBTC
```

The entire MVP purchase mechanism, and the only place balances move after
creation. The two functions differ only in the payment asset (and the
price they read); both share the same checks and the same bookkeeping
(`check-purchase` / `settle-purchase`):


1. Look up the token (`ERR-NOT-FOUND` if it doesn't exist).
2. Reject an asset the token doesn't accept, i.e. its price in that asset
   is `u0` (`ERR-PAYMENT-NOT-ACCEPTED`), `amount <= 0`
   (`ERR-INVALID-AMOUNT`), the creator buying their own token
   (`ERR-CANNOT-BUY-OWN-TOKEN`), and `amount > available-supply`
   (`ERR-INSUFFICIENT-SUPPLY`).
3. Move the payment: `(try! (stx-transfer? cost tx-sender creator))` for
   STX, or a SIP-010 `transfer` on the sBTC token contract for sBTC. Either
   way it goes directly to the creator's own wallet. There is no escrow
   contract and no protocol fee; if this step fails (insufficient
   balance), the whole
   transaction aborts and **no other state in this call changes** — this
   is a Clarity-level guarantee (a public function returning `(err ...)`
   at the top level rolls back every state mutation made during that call),
   not application logic RWAForge has to implement itself. That's what
   makes the purchase atomic: either the payment and the token
   delivery both happen, or neither does.
4. Only after the payment succeeds: decrement the creator's balance,
   increment the buyer's balance, and decrement `available-supply` — all
   by the same `amount`, so `available-supply` and the creator's remaining
   balance stay equal by construction (see "Ownership model" below).

### sBTC

`purchase-with-sbtc` pays through the Stacks sBTC token
(`sbtc-token`, a SIP-010 token with 8 decimals, so `price-sbtc` is in sats).
Clarity resolves `contract-call?` targets statically, so the sBTC contract
is a **literal** in `token-market.clar` rather than a variable or a
function argument: on testnet it is
`ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token`, and a mainnet
deployment must replace it with
`SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` before deploying
(see [DEPLOYMENT.md](./DEPLOYMENT.md)). Because it is hardcoded, a buyer or
creator can't be tricked into paying with a look-alike token, and there is
still no admin who could repoint it.

The payment is a straight `sbtc-token` `transfer` from `tx-sender` (the
buyer) to the creator, so it needs no approval step. The frontend attaches
an exact-amount post-condition to every purchase so the wallet shows, and
enforces, precisely what leaves the buyer's account.

### Ownership model


When a token is created, its entire `total-supply` is credited to the
creator's own balance entry. A purchase moves balance directly from
creator to buyer. There is no separate escrow account and no minting at
purchase time — the creator effectively pre-holds their own unsold
inventory, and `available-supply` is just a denormalized cache of the
creator's current balance (kept in sync in the same transaction that
changes it). This is the ownership model the MVP spec explicitly allows
("or, if your architecture requires the factory/market contract to control
inventory for purchases, explain and implement the ownership model
explicitly") — chosen here for its atomicity and because it avoids a
separate fund-holding admin/escrow account that would itself be a security
surface.

### No general `transfer`

This MVP intentionally exposes no `transfer` function. Balances change
only via `create-token` (initial allocation) and `purchase` /
`purchase-with-sbtc` (creator → buyer) — matching RWAForge's two supported product features exactly, per
the project's scope discipline (see [ROADMAP.md](./ROADMAP.md)).

### Read-only functions

- `get-token(token-id)` → `(optional {...})` — the full token record, or
  `none`.
- `get-token-count()` → `uint` — used by the frontend to enumerate every
  token (`get-token(i)` for `i` in `0..count-1`), the same pattern the
  dormant `rwa-registry.clar` used.
- `get-balance(token-id, owner)` → `uint` — `0` if the wallet never held
  the token, never an error.

### Error constants

`ERR-NOT-FOUND (100)`, `ERR-INVALID-INPUT (101)`, `ERR-INVALID-AMOUNT
(102)`, `ERR-INSUFFICIENT-SUPPLY (103)`, `ERR-CANNOT-BUY-OWN-TOKEN (104)`, `ERR-PAYMENT-NOT-ACCEPTED (105)`.

## Dormant contracts

`sip-010-trait.clar`, `protocol-admin.clar`, `rwa-registry.clar`,
`compliance-registry.clar`, `document-registry.clar`, and `rwa-token.clar`
remain in `contracts/contracts/` with their original 72 tests in
`contracts/tests/`, from an earlier, broader version of this project
(compliance-gated issuance, not a create/purchase MVP). They still pass
`clarinet check` and `npm test`, and are declared in `Clarinet.toml` for
that reason, but the current frontend never deploys, calls, or reads them
— see [DEPLOYMENT.md](./DEPLOYMENT.md), which deploys only
`token-market.clar` to testnet. See [ARCHITECTURE.md](./ARCHITECTURE.md)
"What's dormant in this repo".
