;; token-market
;; RWAForge MVP: create a token and purchase it with real STX or sBTC, on
;; Stacks Testnet. A single contract holds every created token's metadata and
;; balances in maps, rather than deploying a fresh SIP-010 contract per
;; token -- this keeps "create a token" a single wallet-signed contract-call
;; instead of a multi-step contract deployment. See
;; docs/SMART-CONTRACTS.md for the full rationale and the ownership model.
;;
;; Ownership model: when a token is created, its entire total-supply is
;; credited to the creator's balance for that token-id. A purchase moves
;; balance directly from the creator to the buyer and decrements
;; available-supply by the same amount, so `available-supply` and the
;; creator's current balance are always equal by construction. There is no
;; separate escrow: STX payment and token delivery happen atomically in the
;; same transaction, and a failed transfer rolls back every other change
;; Clarity made during the call.
;;
;; Payment assets: a creator prices each token in STX, sBTC, or both (a
;; price of u0 means "not accepted in that asset"; at least one must be
;; set). A buyer pays in whichever accepted asset they hold -- `purchase`
;; for STX, `purchase-with-sbtc` for sBTC -- so Bitcoin holders can buy
;; without first swapping into STX. Both paths share the same ownership
;; bookkeeping, and the payment always goes straight buyer -> creator.
;;
;; This MVP intentionally exposes no `transfer` function -- balances can
;; only change via `create-token` (initial allocation) and `purchase`
;; (creator -> buyer). That keeps the contract's surface area limited to
;; exactly the two product features RWAForge supports right now.

(define-constant ERR-NOT-FOUND (err u100))
(define-constant ERR-INVALID-INPUT (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-INSUFFICIENT-SUPPLY (err u103))
(define-constant ERR-CANNOT-BUY-OWN-TOKEN (err u104))
(define-constant ERR-PAYMENT-NOT-ACCEPTED (err u105))

;; ---------- state ----------

(define-data-var next-token-id uint u0)

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

;; ---------- public: create ----------

(define-public (create-token
    (name (string-ascii 64))
    (symbol (string-ascii 10))
    (description (string-utf8 500))
    (category (string-ascii 20))
    (total-supply uint)
    (price-stx uint)
    (price-sbtc uint))
  (let ((token-id (var-get next-token-id)))
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len symbol) u0) ERR-INVALID-INPUT)
    (asserts! (> (len category) u0) ERR-INVALID-INPUT)
    (asserts! (> total-supply u0) ERR-INVALID-AMOUNT)
    (asserts! (or (> price-stx u0) (> price-sbtc u0)) ERR-INVALID-AMOUNT)
    (map-set tokens token-id {
      creator: tx-sender,
      name: name,
      symbol: symbol,
      description: description,
      category: category,
      total-supply: total-supply,
      available-supply: total-supply,
      price-stx: price-stx,
      price-sbtc: price-sbtc,
      created-at: stacks-block-height
    })
    (map-set balances {token-id: token-id, owner: tx-sender} total-supply)
    (var-set next-token-id (+ token-id u1))
    (print {
      event: "token-created",
      token-id: token-id,
      creator: tx-sender,
      name: name,
      symbol: symbol,
      total-supply: total-supply,
      price-stx: price-stx,
      price-sbtc: price-sbtc
    })
    (ok token-id)))

;; ---------- public: purchase ----------

;; Buy `amount` tokens, paying in STX at the token's price-stx.
(define-public (purchase (token-id uint) (amount uint))
  (let (
      (token (unwrap! (map-get? tokens token-id) ERR-NOT-FOUND))
      (price (get price-stx token))
      (cost (* amount price))
    )
    (asserts! (> price u0) ERR-PAYMENT-NOT-ACCEPTED)
    (try! (check-purchase token amount))
    (try! (stx-transfer? cost tx-sender (get creator token)))
    (settle-purchase token-id token amount "STX" cost)))

;; Buy `amount` tokens, paying in sBTC at the token's price-sbtc.
;;
;; The sBTC contract below is the Stacks Testnet sBTC token (SIP-010, 8
;; decimals). Clarity resolves contract-call? targets statically, so it must
;; be a literal, not a variable: a mainnet deployment must swap it for
;; SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token. See
;; docs/DEPLOYMENT.md.
(define-public (purchase-with-sbtc (token-id uint) (amount uint))
  (let (
      (token (unwrap! (map-get? tokens token-id) ERR-NOT-FOUND))
      (price (get price-sbtc token))
      (cost (* amount price))
    )
    (asserts! (> price u0) ERR-PAYMENT-NOT-ACCEPTED)
    (try! (check-purchase token amount))
    (try! (contract-call? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token transfer cost tx-sender (get creator token) none))
    (settle-purchase token-id token amount "sBTC" cost)))

;; ---------- private ----------

;; Checks shared by both payment paths.
(define-private (check-purchase
    (token {creator: principal, name: (string-ascii 64), symbol: (string-ascii 10),
            description: (string-utf8 500), category: (string-ascii 20), total-supply: uint,
            available-supply: uint, price-stx: uint, price-sbtc: uint, created-at: uint})
    (amount uint))
  (begin
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq tx-sender (get creator token))) ERR-CANNOT-BUY-OWN-TOKEN)
    (asserts! (<= amount (get available-supply token)) ERR-INSUFFICIENT-SUPPLY)
    (ok true)))

;; Runs only after the payment has succeeded: moves `amount` tokens from the
;; creator to the buyer and records the sale.
(define-private (settle-purchase
    (token-id uint)
    (token {creator: principal, name: (string-ascii 64), symbol: (string-ascii 10),
            description: (string-utf8 500), category: (string-ascii 20), total-supply: uint,
            available-supply: uint, price-stx: uint, price-sbtc: uint, created-at: uint})
    (amount uint)
    (asset (string-ascii 4))
    (cost uint))
  (let (
      (creator (get creator token))
      (available (get available-supply token))
      (buyer tx-sender)
      (buyer-balance (default-to u0 (map-get? balances {token-id: token-id, owner: tx-sender})))
    )
    (map-set balances {token-id: token-id, owner: creator} (- available amount))
    (map-set balances {token-id: token-id, owner: buyer} (+ buyer-balance amount))
    (map-set tokens token-id (merge token {available-supply: (- available amount)}))
    (print {
      event: "token-purchased",
      token-id: token-id,
      buyer: buyer,
      seller: creator,
      amount: amount,
      asset: asset,
      cost: cost
    })
    (ok true)))

;; ---------- read-only ----------

(define-read-only (get-token (token-id uint))
  (map-get? tokens token-id))

(define-read-only (get-token-count)
  (var-get next-token-id))

(define-read-only (get-balance (token-id uint) (owner principal))
  (default-to u0 (map-get? balances {token-id: token-id, owner: owner})))
