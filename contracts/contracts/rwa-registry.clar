;; rwa-registry
;; Canonical on-chain registry of Real-World Assets created through RWAForge.
;;
;; An RWA entry is the root record an issuer creates before deploying a
;; token contract for it. It carries identifying/off-chain-pointer fields
;; only -- rich metadata (images, long-form descriptions, valuations) is
;; expected to live off-chain behind `metadata-uri`, with this record
;; anchoring the canonical id, issuer, and verification state on-chain.
;;
;; Verification status is protocol-controlled (protocol-admin or a
;; registered compliance-admin), never self-assigned by the issuer, and
;; never implies legal/regulatory approval -- see docs/SECURITY.md and the
;; product disclaimer surfaced in the frontend.

;; ---------- error constants ----------
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u101))
(define-constant ERR-NOT-ISSUER (err u102))
(define-constant ERR-ALREADY-SET (err u103))
(define-constant ERR-INVALID-STATUS (err u104))
(define-constant ERR-INVALID-INPUT (err u105))

;; ---------- verification status enum ----------
(define-constant VERIFICATION-UNVERIFIED u0)
(define-constant VERIFICATION-PENDING u1)
(define-constant VERIFICATION-VERIFIED u2)
(define-constant VERIFICATION-REJECTED u3)

;; ---------- state ----------
(define-data-var next-rwa-id uint u0)

(define-map rwas
  uint
  {
    issuer: principal,
    asset-name: (string-ascii 64),
    asset-symbol: (string-ascii 12),
    asset-category: (string-ascii 32),
    description: (string-utf8 500),
    jurisdiction: (string-ascii 56),
    token-contract: (optional principal),
    metadata-uri: (optional (string-utf8 256)),
    verification-status: uint,
    active: bool,
    created-at: uint,
    updated-at: uint
  })

;; ---------- private helpers ----------
(define-private (is-authorized-verifier (who principal))
  (or (contract-call? .protocol-admin is-protocol-admin who)
      (contract-call? .protocol-admin is-compliance-admin who)))

;; ---------- public: issuer actions ----------

(define-public (create-rwa
    (asset-name (string-ascii 64))
    (asset-symbol (string-ascii 12))
    (asset-category (string-ascii 32))
    (description (string-utf8 500))
    (jurisdiction (string-ascii 56))
    (metadata-uri (optional (string-utf8 256))))
  (let ((rwa-id (var-get next-rwa-id)))
    (asserts! (> (len asset-name) u0) ERR-INVALID-INPUT)
    (asserts! (> (len asset-symbol) u0) ERR-INVALID-INPUT)
    (asserts! (> (len asset-category) u0) ERR-INVALID-INPUT)
    (map-set rwas rwa-id {
      issuer: tx-sender,
      asset-name: asset-name,
      asset-symbol: asset-symbol,
      asset-category: asset-category,
      description: description,
      jurisdiction: jurisdiction,
      token-contract: none,
      metadata-uri: metadata-uri,
      verification-status: VERIFICATION-UNVERIFIED,
      active: true,
      created-at: stacks-block-height,
      updated-at: stacks-block-height
    })
    (var-set next-rwa-id (+ rwa-id u1))
    (print {event: "rwa-created", rwa-id: rwa-id, issuer: tx-sender, asset-name: asset-name, asset-symbol: asset-symbol})
    (ok rwa-id)))

(define-public (update-rwa
    (rwa-id uint)
    (description (string-utf8 500))
    (jurisdiction (string-ascii 56))
    (metadata-uri (optional (string-utf8 256))))
  (let ((rwa (unwrap! (map-get? rwas rwa-id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get issuer rwa)) ERR-NOT-ISSUER)
    (map-set rwas rwa-id (merge rwa {
      description: description,
      jurisdiction: jurisdiction,
      metadata-uri: metadata-uri,
      updated-at: stacks-block-height
    }))
    (print {event: "rwa-updated", rwa-id: rwa-id})
    (ok true)))

;; Link the deployed token contract to its RWA profile. Can only be called
;; once per RWA to prevent an issuer from silently re-pointing a published
;; asset at a different token contract after investors have started relying
;; on it.
(define-public (set-token-contract (rwa-id uint) (token-contract principal))
  (let ((rwa (unwrap! (map-get? rwas rwa-id) ERR-NOT-FOUND)))
    (asserts! (is-eq tx-sender (get issuer rwa)) ERR-NOT-ISSUER)
    (asserts! (is-none (get token-contract rwa)) ERR-ALREADY-SET)
    (map-set rwas rwa-id (merge rwa {
      token-contract: (some token-contract),
      updated-at: stacks-block-height
    }))
    (print {event: "token-contract-linked", rwa-id: rwa-id, token-contract: token-contract})
    (ok true)))

(define-public (deactivate-rwa (rwa-id uint))
  (let ((rwa (unwrap! (map-get? rwas rwa-id) ERR-NOT-FOUND)))
    (asserts! (or (is-eq tx-sender (get issuer rwa)) (contract-call? .protocol-admin is-protocol-admin tx-sender)) ERR-NOT-AUTHORIZED)
    (map-set rwas rwa-id (merge rwa {active: false, updated-at: stacks-block-height}))
    (print {event: "rwa-deactivated", rwa-id: rwa-id})
    (ok true)))

(define-public (reactivate-rwa (rwa-id uint))
  (let ((rwa (unwrap! (map-get? rwas rwa-id) ERR-NOT-FOUND)))
    (asserts! (or (is-eq tx-sender (get issuer rwa)) (contract-call? .protocol-admin is-protocol-admin tx-sender)) ERR-NOT-AUTHORIZED)
    (map-set rwas rwa-id (merge rwa {active: true, updated-at: stacks-block-height}))
    (print {event: "rwa-reactivated", rwa-id: rwa-id})
    (ok true)))

;; ---------- public: protocol-controlled verification ----------

(define-public (update-verification-status (rwa-id uint) (status uint))
  (let ((rwa (unwrap! (map-get? rwas rwa-id) ERR-NOT-FOUND)))
    (asserts! (is-authorized-verifier tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (<= status VERIFICATION-REJECTED) ERR-INVALID-STATUS)
    (map-set rwas rwa-id (merge rwa {verification-status: status, updated-at: stacks-block-height}))
    (print {event: "verification-updated", rwa-id: rwa-id, status: status})
    (ok true)))

;; ---------- read-only ----------

(define-read-only (get-rwa (rwa-id uint))
  (map-get? rwas rwa-id))

(define-read-only (get-issuer (rwa-id uint))
  (match (map-get? rwas rwa-id)
    rwa (some (get issuer rwa))
    none))

(define-read-only (get-next-rwa-id)
  (var-get next-rwa-id))

(define-read-only (get-rwa-count)
  (var-get next-rwa-id))
