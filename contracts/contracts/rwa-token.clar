;; rwa-token
;; SIP-010 fungible token template representing a single tokenized
;; real-world asset. A fresh copy of this contract is deployed once per RWA
;; by that asset's issuer, then linked back to its rwa-registry entry via
;; `rwa-registry.set-token-contract`.
;;
;; DEPLOYMENT NOTE (see docs/SMART-CONTRACTS.md "Token factory pattern"):
;; Clarity has no runtime contract factory, so this file is used as a
;; *template*. It references the protocol's singleton compliance-registry
;; and protocol-admin contracts via the `.contract-name` shorthand, which
;; resolves to "the contract named X deployed by whoever deploys THIS
;; contract". That is correct as-is when the same account deploys the
;; protocol singletons and the token (true in Clarinet tests and for a
;; platform-operated deployer). For an issuer who deploys tokens from their
;; own wallet, RWAForge's deploy pipeline (packages/stacks/token-template.ts)
;; substitutes these shorthands for the protocol's fully-qualified
;; principal before broadcasting, so the compiled source always points at
;; the real, protocol-owned registry -- never at a copy the issuer
;; controls.

(impl-trait .sip-010-trait.sip-010-trait)

(define-fungible-token rwa-token)

;; ---------- constants ----------
(define-constant DEPLOYER tx-sender)

(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-ISSUER (err u101))
(define-constant ERR-ALREADY-INITIALIZED (err u102))
(define-constant ERR-NOT-INITIALIZED (err u103))
(define-constant ERR-PAUSED (err u104))
(define-constant ERR-PROTOCOL-PAUSED (err u105))
(define-constant ERR-NOT-ELIGIBLE-SENDER (err u106))
(define-constant ERR-NOT-ELIGIBLE-RECIPIENT (err u107))
(define-constant ERR-MINTING-DISABLED (err u108))
(define-constant ERR-BURNING-DISABLED (err u109))
(define-constant ERR-MAX-SUPPLY-EXCEEDED (err u110))
(define-constant ERR-INVALID-AMOUNT (err u111))
(define-constant ERR-INVALID-INPUT (err u112))

;; ---------- state ----------
(define-data-var initialized bool false)
(define-data-var issuer principal DEPLOYER)
(define-data-var rwa-id uint u0)
(define-data-var token-name (string-ascii 32) "")
(define-data-var token-symbol (string-ascii 10) "")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var max-supply uint u0)
(define-data-var mint-enabled bool true)
(define-data-var burn-enabled bool true)
(define-data-var transfer-restricted bool true)
(define-data-var paused bool false)

;; ---------- one-time initialization ----------
;; Clarity contracts have no constructor arguments beyond tx-sender, so
;; setup happens in an explicit `initialize` call made by the deployer
;; immediately after the deploy transaction confirms. The frontend's
;; deployment wizard broadcasts `initialize` right after the deploy, and
;; the asset is not linked into rwa-registry until this succeeds.
(define-public (initialize
    (rwa-id-param uint)
    (name (string-ascii 32))
    (symbol (string-ascii 10))
    (decimals uint)
    (uri (optional (string-utf8 256)))
    (max-supply-param uint)
    (initial-supply uint)
    (initial-holder principal)
    (mintable bool)
    (burnable bool)
    (restricted bool))
  (begin
    (asserts! (is-eq tx-sender DEPLOYER) ERR-NOT-AUTHORIZED)
    (asserts! (not (var-get initialized)) ERR-ALREADY-INITIALIZED)
    (asserts! (> (len name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len symbol) u0) ERR-INVALID-INPUT)
    (asserts! (<= decimals u18) ERR-INVALID-INPUT)
    (asserts! (or (is-eq max-supply-param u0) (<= initial-supply max-supply-param)) ERR-MAX-SUPPLY-EXCEEDED)
    (var-set initialized true)
    (var-set issuer tx-sender)
    (var-set rwa-id rwa-id-param)
    (var-set token-name name)
    (var-set token-symbol symbol)
    (var-set token-decimals decimals)
    (var-set token-uri uri)
    (var-set max-supply max-supply-param)
    (var-set mint-enabled mintable)
    (var-set burn-enabled burnable)
    (var-set transfer-restricted restricted)
    (if (> initial-supply u0)
      (try! (ft-mint? rwa-token initial-supply initial-holder))
      true)
    (print {event: "token-initialized", rwa-id: rwa-id-param, issuer: tx-sender, name: name, symbol: symbol, initial-supply: initial-supply})
    (ok true)))

;; ---------- issuer administration ----------

(define-public (mint (amount uint) (recipient principal))
  (begin
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-eq tx-sender (var-get issuer)) ERR-NOT-ISSUER)
    (asserts! (var-get mint-enabled) ERR-MINTING-DISABLED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts!
      (or (is-eq (var-get max-supply) u0)
          (<= (+ (ft-get-supply rwa-token) amount) (var-get max-supply)))
      ERR-MAX-SUPPLY-EXCEEDED)
    (try! (ft-mint? rwa-token amount recipient))
    (print {event: "mint", rwa-id: (var-get rwa-id), amount: amount, recipient: recipient})
    (ok true)))

;; Burn `amount` from `holder`. Callable by the holder themselves (voluntary
;; burn) or by the issuer (e.g. processing an off-chain redemption) -- never
;; by an unrelated third party.
(define-public (burn (amount uint) (holder principal))
  (begin
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (var-get burn-enabled) ERR-BURNING-DISABLED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (or (is-eq tx-sender holder) (is-eq tx-sender (var-get issuer))) ERR-NOT-AUTHORIZED)
    (try! (ft-burn? rwa-token amount holder))
    (print {event: "burn", rwa-id: (var-get rwa-id), amount: amount, holder: holder, initiator: tx-sender})
    (ok true)))

(define-public (pause)
  (begin
    (asserts! (is-eq tx-sender (var-get issuer)) ERR-NOT-ISSUER)
    (var-set paused true)
    (print {event: "token-paused", rwa-id: (var-get rwa-id)})
    (ok true)))

(define-public (unpause)
  (begin
    (asserts! (is-eq tx-sender (var-get issuer)) ERR-NOT-ISSUER)
    (var-set paused false)
    (print {event: "token-unpaused", rwa-id: (var-get rwa-id)})
    (ok true)))

(define-public (set-transfer-restricted (restricted bool))
  (begin
    (asserts! (is-eq tx-sender (var-get issuer)) ERR-NOT-ISSUER)
    (var-set transfer-restricted restricted)
    (print {event: "transfer-restriction-updated", rwa-id: (var-get rwa-id), restricted: restricted})
    (ok true)))

(define-public (set-token-uri (uri (optional (string-utf8 256))))
  (begin
    (asserts! (is-eq tx-sender (var-get issuer)) ERR-NOT-ISSUER)
    (var-set token-uri uri)
    (print {event: "metadata-updated", rwa-id: (var-get rwa-id)})
    (ok true)))

;; ---------- SIP-010 ----------

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (var-get initialized) ERR-NOT-INITIALIZED)
    (asserts! (is-eq tx-sender sender) ERR-NOT-AUTHORIZED)
    (asserts! (not (is-eq sender recipient)) ERR-INVALID-INPUT)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (not (var-get paused)) ERR-PAUSED)
    (asserts! (not (contract-call? .protocol-admin get-protocol-paused)) ERR-PROTOCOL-PAUSED)
    (and (var-get transfer-restricted)
         (begin
           (asserts! (contract-call? .compliance-registry is-eligible (var-get rwa-id) sender) ERR-NOT-ELIGIBLE-SENDER)
           (asserts! (contract-call? .compliance-registry is-eligible (var-get rwa-id) recipient) ERR-NOT-ELIGIBLE-RECIPIENT)
           true))
    (try! (ft-transfer? rwa-token amount sender recipient))
    (print memo)
    (print {event: "transfer", rwa-id: (var-get rwa-id), amount: amount, sender: sender, recipient: recipient})
    (ok true)))

(define-read-only (get-name)
  (ok (var-get token-name)))

(define-read-only (get-symbol)
  (ok (var-get token-symbol)))

(define-read-only (get-decimals)
  (ok (var-get token-decimals)))

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance rwa-token who)))

(define-read-only (get-total-supply)
  (ok (ft-get-supply rwa-token)))

(define-read-only (get-token-uri)
  (ok (var-get token-uri)))

;; ---------- extra read-only accessors (not part of SIP-010) ----------

(define-read-only (get-issuer)
  (var-get issuer))

(define-read-only (get-rwa-id)
  (var-get rwa-id))

(define-read-only (get-max-supply)
  (var-get max-supply))

(define-read-only (is-paused)
  (var-get paused))

(define-read-only (is-mint-enabled)
  (var-get mint-enabled))

(define-read-only (is-burn-enabled)
  (var-get burn-enabled))

(define-read-only (is-transfer-restricted)
  (var-get transfer-restricted))

(define-read-only (is-initialized)
  (var-get initialized))

(define-read-only (get-token-info)
  (ok {
    name: (var-get token-name),
    symbol: (var-get token-symbol),
    decimals: (var-get token-decimals),
    total-supply: (ft-get-supply rwa-token),
    max-supply: (var-get max-supply),
    issuer: (var-get issuer),
    rwa-id: (var-get rwa-id),
    paused: (var-get paused),
    mint-enabled: (var-get mint-enabled),
    burn-enabled: (var-get burn-enabled),
    transfer-restricted: (var-get transfer-restricted)
  }))
