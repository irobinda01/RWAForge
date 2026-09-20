;; token-market
;; RWAForge MVP: create a token and purchase it with real STX, on Stacks
;; Testnet. A single contract holds every created token's metadata and
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
;; This MVP intentionally exposes no `transfer` function -- balances can
;; only change via `create-token` (initial allocation) and `purchase`
;; (creator -> buyer). That keeps the contract's surface area limited to
;; exactly the two product features RWAForge supports right now.

(define-constant ERR-NOT-FOUND (err u100))
(define-constant ERR-INVALID-INPUT (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-INSUFFICIENT-SUPPLY (err u103))
(define-constant ERR-CANNOT-BUY-OWN-TOKEN (err u104))

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
    price: uint, ;; micro-STX per whole token
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
    (price uint))
  (let ((token-id (var-get next-token-id)))
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len symbol) u0) ERR-INVALID-INPUT)
    (asserts! (> (len category) u0) ERR-INVALID-INPUT)
    (asserts! (> total-supply u0) ERR-INVALID-AMOUNT)
    (asserts! (> price u0) ERR-INVALID-AMOUNT)
    (map-set tokens token-id {
      creator: tx-sender,
      name: name,
      symbol: symbol,
      description: description,
      category: category,
      total-supply: total-supply,
      available-supply: total-supply,
      price: price,
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
      price: price
    })
    (ok token-id)))

;; ---------- public: purchase ----------

(define-public (purchase (token-id uint) (amount uint))
  (let (
      (token (unwrap! (map-get? tokens token-id) ERR-NOT-FOUND))
      (creator (get creator token))
      (available (get available-supply token))
      (price (get price token))
      (cost (* amount price))
      (buyer tx-sender)
      (buyer-balance (default-to u0 (map-get? balances {token-id: token-id, owner: tx-sender})))
    )
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (is-eq buyer creator)) ERR-CANNOT-BUY-OWN-TOKEN)
    (asserts! (<= amount available) ERR-INSUFFICIENT-SUPPLY)
    (try! (stx-transfer? cost buyer creator))
    (map-set balances {token-id: token-id, owner: creator} (- available amount))
    (map-set balances {token-id: token-id, owner: buyer} (+ buyer-balance amount))
    (map-set tokens token-id (merge token {available-supply: (- available amount)}))
    (print {
      event: "token-purchased",
      token-id: token-id,
      buyer: buyer,
      seller: creator,
      amount: amount,
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
