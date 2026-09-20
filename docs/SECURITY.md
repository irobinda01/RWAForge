# Security

## `token-market.clar` threat model

| Threat | Mitigation |
|---|---|
| Unauthorized token creation | Anyone can call `create-token` — by design, RWAForge is self-service. `tx-sender` becomes the token's `creator`; never a client-supplied field. |
| Buying more than available supply | `purchase` asserts `amount <= available-supply` (`ERR-INSUFFICIENT-SUPPLY`) before any state change. Tested: "rejects a purchase exceeding available supply", "rejects any purchase after sellout". |
| Payment without delivery, or delivery without payment | The payment (`stx-transfer?` for `purchase`, the sBTC token's `transfer` for `purchase-with-sbtc`) runs before any balance/supply mutation. If it fails, the whole call aborts and Clarity rolls back every state change made during it — there is no code path where tokens move without the matching payment succeeding, or vice versa. See "Atomicity" below. |
| Paying with the wrong or a look-alike asset | `purchase-with-sbtc` calls a hardcoded sBTC contract literal (Clarity resolves `contract-call?` targets statically), so a buyer can't be routed through a fake token contract and there is no setter that could repoint it. Each purchase function only reads its own asset's price, and a token that doesn't accept an asset (price `u0`) rejects it with `ERR-PAYMENT-NOT-ACCEPTED` before any payment moves — a free purchase via an unpriced asset is impossible. Tested: "rejects an sBTC purchase of a token that only accepts STX" and the reverse. |
| Double-spend of a creator's inventory | `available-supply` and the creator's on-chain balance for that token-id are decremented by the exact same amount in the same transaction, so they can never drift apart. There is no code path that mutates one without the other. |
| Price manipulation | `price-stx` and `price-sbtc` are set once, at `create-token` time, by the creator, and have no setter afterward — a buyer's cost (`amount * price`) can't be changed after they've seen it, and the frontend computes the identical multiplication the contract does before showing "Total". The two prices are independent and creator-chosen: RWAForge does not convert between STX and BTC, so a creator who sets stale or mismatched prices simply sells at those prices. |
| Integer overflow/underflow | Clarity's `uint` arithmetic traps on overflow/underflow at the VM level (the transaction aborts), so `amount * price`, `available - amount`, etc. can't silently wrap. No manual overflow checks are needed or added. |
| Self-dealing / wash trading via self-purchase | `purchase` explicitly rejects `tx-sender == creator` (`ERR-CANNOT-BUY-OWN-TOKEN`) rather than relying on it being a harmless no-op. |
| Registry/id spoofing | `token-id` is an auto-incrementing counter assigned by the contract itself (`var-get next-token-id`), never client-supplied. |
| Unauthorized withdrawal of funds | There is no admin, owner, or protocol account with any special privilege in this contract at all — no `set-*-admin`, no pause switch, no fee. The contract never holds STX or sBTC: payment only ever moves buyer → creator, inside `purchase` / `purchase-with-sbtc`, for the exact `amount * price` computed from on-chain state. |
| Trust in the sBTC token contract | `purchase-with-sbtc` inherits the sBTC token's own security: a SIP-010 `transfer` that fails returns an error and rolls the purchase back, and `tx-sender` (the buyer) authorizes it directly — the contract never uses `as-contract` or any allowance. RWAForge's contract and tests do not audit sBTC itself. |
| Contract upgrade risk | Standard Clarity immutability — once deployed, `token-market.clar`'s logic cannot change. Fixing a bug means deploying a new contract and pointing `NEXT_PUBLIC_MARKET_CONTRACT_ID` at it; existing tokens on the old contract are unaffected but also not migrated automatically. |

## Atomicity, concretely

A Clarity public function that returns `(err ...)` at the top level has
**zero** state changes applied — this is a VM-level guarantee, not
something the contract author has to implement with manual rollback logic.
`purchase` relies on this directly: every `asserts!`/`try!` in the function
runs before any `map-set`, so any failure — token not found, invalid
amount, self-purchase, insufficient supply, an asset the token doesn't
accept, or a failed payment (insufficient buyer STX or sBTC) — leaves both
the `tokens` and `balances` maps exactly as they were. The 32 tests in
`contracts/tests/token-market.test.ts` include explicit before/after
balance assertions (STX via `simnet.getAssetsMap()`, sBTC via the token's
`get-balance`) proving the payment actually moves on a successful call, not
just that the function returns `ok`, and that a failed sBTC purchase
changes no balance or supply.

## No admin, no backdoor

Unlike the dormant `protocol-admin.clar`/`rwa-token.clar` pair (which had
an emergency pause and issuer mint/burn), `token-market.clar` has no
privileged account of any kind. This is a deliberate MVP scope choice: the
two supported features (create, purchase) don't need one, and adding an
admin role would be exactly the kind of unnecessary complexity the spec
warns against. A production version might reintroduce a narrowly-scoped
circuit breaker — see [ROADMAP.md](./ROADMAP.md).

## Frontend trust boundaries

- **No server-side signing, no API routes at all.** Every mutating action
  (`buildCreateTokenTx`, `buildPurchaseTx`) is built as an unsigned
  transaction and handed to the user's own wallet extension via
  `@stacks/connect`. There is nothing in this app that holds a private key
  or could broadcast on a user's behalf, because there is no server-side
  code path that touches a transaction at all.
- **All state is re-read from the chain, never inferred.** After a
  transaction confirms, the frontend re-fetches `get-token`/`get-balance`
  from the contract rather than optimistically patching local state — see
  "Data fetching" in [FRONTEND.md](./FRONTEND.md).
- **Purchases carry an exact-amount post-condition.** `buildPurchaseTx`
  attaches a post-condition in `deny` mode saying the buyer sends exactly
  `cost` of the chosen asset (micro-STX or sBTC sats) and nothing else, so
  the wallet shows the precise amount and aborts the transaction if the
  contract ever moved a different amount or a different asset.
- **Balance pre-checks are advisory, not authoritative.** The purchase
  form checks the buyer's STX or sBTC balance (whichever asset they chose)
  against the purchase cost before prompting the wallet, purely to give a
  clearer error message than a failed broadcast would. The contract's own
  transfer call is the real enforcement point regardless of what the
  frontend checked.

## `clarinet check` warnings

`clarinet check` reports "use of potentially unchecked data" warnings for
`token-market.clar` (e.g. `description`, `category` flowing into
`map-set`). This is the static analyzer flagging every place user-supplied
input reaches contract storage — expected here, since `create-token` is
intentionally self-service with no admin gate. There's no authorization
bypass: every state-mutating branch is reached only after its `asserts!`
checks pass, and the test suite includes explicit rejection cases for
every validated input (empty name/symbol/category, zero supply, no price set in either asset,
zero purchase amount, over-supply purchase, self-purchase, unaccepted
payment asset).

## Dormant contracts

The five dormant contracts (`rwa-registry`, `compliance-registry`,
`document-registry`, `protocol-admin`, `rwa-token`) retain their original
threat model and test coverage from the earlier compliance-platform
version of this project, but are not deployed or called by the current
MVP frontend — see [ARCHITECTURE.md](./ARCHITECTURE.md) "What's dormant in
this repo".
