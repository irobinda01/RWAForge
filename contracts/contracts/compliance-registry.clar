;; compliance-registry
;; Issuer-controlled investor eligibility registry.
;;
;; RWAForge does NOT perform KYC itself. This contract records only the
;; minimum eligibility state an issuer (or a protocol compliance-admin)
;; needs to gate transfers on a given RWA's token contract: a whitelist
;; flag, an active/suspended status, an optional investor class, an
;; optional jurisdiction code, and an optional expiry height.
;;
;; NEVER store personal data here (names, passport numbers, addresses,
;; phone numbers, documents). That data -- if collected at all -- belongs
;; in the issuer's own off-chain KYC/compliance tooling, entirely outside
;; RWAForge's on-chain surface.
;;
;; Eligibility is scoped per (rwa-id, wallet) pair: being whitelisted for
;; one RWA does not make a wallet eligible for another issuer's asset.

;; ---------- error constants ----------
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u101))
(define-constant ERR-RWA-NOT-FOUND (err u102))
(define-constant ERR-INVALID-INPUT (err u103))
(define-constant ERR-TOO-MANY-ENTRIES (err u104))

;; ---------- investor class enum ----------
(define-constant CLASS-RETAIL u0)
(define-constant CLASS-ACCREDITED u1)
(define-constant CLASS-INSTITUTIONAL u2)
(define-constant CLASS-RESTRICTED u3)

;; ---------- status enum ----------
(define-constant STATUS-ACTIVE u0)
(define-constant STATUS-SUSPENDED u1)

;; ---------- state ----------
(define-map eligibility
  {rwa-id: uint, wallet: principal}
  {
    whitelisted: bool,
    status: uint,
    investor-class: uint,
    jurisdiction: (optional (string-ascii 8)),
    expiry-height: (optional uint),
    added-by: principal,
    added-at: uint
  })

;; ---------- authorization ----------

;; A wallet may manage compliance for an RWA if it is that RWA's registered
;; issuer, a registered protocol compliance-admin, or the protocol admin.
(define-private (is-compliance-manager (rwa-id uint) (who principal))
  (or
    (is-eq (some who) (contract-call? .rwa-registry get-issuer rwa-id))
    (contract-call? .protocol-admin is-compliance-admin who)
    (contract-call? .protocol-admin is-protocol-admin who)))

(define-private (assert-manager (rwa-id uint))
  (begin
    (asserts! (is-some (contract-call? .rwa-registry get-issuer rwa-id)) ERR-RWA-NOT-FOUND)
    (asserts! (is-compliance-manager rwa-id tx-sender) ERR-NOT-AUTHORIZED)
    (ok true)))

;; ---------- public ----------

(define-public (add-investor
    (rwa-id uint)
    (wallet principal)
    (investor-class uint)
    (jurisdiction (optional (string-ascii 8)))
    (expiry-height (optional uint)))
  (begin
    (try! (assert-manager rwa-id))
    (asserts! (<= investor-class CLASS-RESTRICTED) ERR-INVALID-INPUT)
    (map-set eligibility {rwa-id: rwa-id, wallet: wallet} {
      whitelisted: true,
      status: STATUS-ACTIVE,
      investor-class: investor-class,
      jurisdiction: jurisdiction,
      expiry-height: expiry-height,
      added-by: tx-sender,
      added-at: stacks-block-height
    })
    (print {event: "investor-added", rwa-id: rwa-id, wallet: wallet, investor-class: investor-class})
    (ok true)))

(define-public (remove-investor (rwa-id uint) (wallet principal))
  (begin
    (try! (assert-manager rwa-id))
    (asserts! (is-some (map-get? eligibility {rwa-id: rwa-id, wallet: wallet})) ERR-NOT-FOUND)
    (map-delete eligibility {rwa-id: rwa-id, wallet: wallet})
    (print {event: "investor-removed", rwa-id: rwa-id, wallet: wallet})
    (ok true)))

(define-public (suspend-investor (rwa-id uint) (wallet principal))
  (begin
    (try! (assert-manager rwa-id))
    (let ((entry (unwrap! (map-get? eligibility {rwa-id: rwa-id, wallet: wallet}) ERR-NOT-FOUND)))
      (map-set eligibility {rwa-id: rwa-id, wallet: wallet} (merge entry {status: STATUS-SUSPENDED}))
      (print {event: "investor-suspended", rwa-id: rwa-id, wallet: wallet})
      (ok true))))

(define-public (reinstate-investor (rwa-id uint) (wallet principal))
  (begin
    (try! (assert-manager rwa-id))
    (let ((entry (unwrap! (map-get? eligibility {rwa-id: rwa-id, wallet: wallet}) ERR-NOT-FOUND)))
      (map-set eligibility {rwa-id: rwa-id, wallet: wallet} (merge entry {status: STATUS-ACTIVE}))
      (print {event: "investor-reinstated", rwa-id: rwa-id, wallet: wallet})
      (ok true))))

;; Batch-add up to 20 investors to the same RWA in a single transaction.
;; Authorization is checked once up front; each entry is then written
;; unconditionally by the private setter below.
(define-private (add-one-investor (entry {wallet: principal, investor-class: uint, jurisdiction: (optional (string-ascii 8)), expiry-height: (optional uint)}) (rwa-id uint))
  (begin
    (map-set eligibility {rwa-id: rwa-id, wallet: (get wallet entry)} {
      whitelisted: true,
      status: STATUS-ACTIVE,
      investor-class: (get investor-class entry),
      jurisdiction: (get jurisdiction entry),
      expiry-height: (get expiry-height entry),
      added-by: tx-sender,
      added-at: stacks-block-height
    })
    rwa-id))

(define-public (batch-add-investors
    (rwa-id uint)
    (entries (list 20 {wallet: principal, investor-class: uint, jurisdiction: (optional (string-ascii 8)), expiry-height: (optional uint)})))
  (begin
    (try! (assert-manager rwa-id))
    (fold add-one-investor entries rwa-id)
    (print {event: "investors-batch-added", rwa-id: rwa-id, count: (len entries)})
    (ok (len entries))))

;; ---------- read-only ----------

(define-read-only (get-eligibility (rwa-id uint) (wallet principal))
  (map-get? eligibility {rwa-id: rwa-id, wallet: wallet}))

(define-read-only (is-eligible (rwa-id uint) (wallet principal))
  (match (map-get? eligibility {rwa-id: rwa-id, wallet: wallet})
    entry (and
            (get whitelisted entry)
            (is-eq (get status entry) STATUS-ACTIVE)
            (match (get expiry-height entry)
              expiry (<= stacks-block-height expiry)
              true))
    false))
