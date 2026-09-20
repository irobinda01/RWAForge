;; protocol-admin
;; Minimal protocol-level role registry and emergency control for RWAForge.
;;
;; Responsibilities (intentionally narrow -- see docs/SECURITY.md):
;;  - Track the single protocol-admin principal (transferable, never zero).
;;  - Maintain a registry of protocol-level compliance-admin accounts, who
;;    may manage investor eligibility on ANY RWA in addition to that RWA's
;;    own issuer (see compliance-registry.clar).
;;  - Expose a protocol-wide emergency pause switch that other contracts
;;    (rwa-token.clar) consult before allowing transfers.
;;
;; The protocol admin explicitly CANNOT: move user funds, mint/burn tokens,
;; edit RWA metadata, or bypass an issuer's control over their own asset.
;; It is a circuit breaker and role registry, not an owner of user assets.

;; ---------- error constants ----------
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-INPUT (err u101))

;; ---------- state ----------
(define-data-var protocol-admin-principal principal tx-sender)
(define-data-var protocol-paused bool false)
(define-map compliance-admins principal bool)

;; ---------- authorization helpers ----------
(define-read-only (is-protocol-admin (who principal))
  (is-eq who (var-get protocol-admin-principal)))

(define-read-only (is-compliance-admin (who principal))
  (default-to false (map-get? compliance-admins who)))

;; ---------- public: role management ----------

;; Transfer the protocol-admin role to a new principal. Only the current
;; admin can do this. The new admin can never be the burn address pattern
;; (tx-sender already guarantees a real signing principal).
(define-public (set-protocol-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get protocol-admin-principal)) ERR-NOT-AUTHORIZED)
    (var-set protocol-admin-principal new-admin)
    (print {event: "protocol-admin-updated", new-admin: new-admin})
    (ok true)))

(define-public (add-compliance-admin (who principal))
  (begin
    (asserts! (is-eq tx-sender (var-get protocol-admin-principal)) ERR-NOT-AUTHORIZED)
    (map-set compliance-admins who true)
    (print {event: "compliance-admin-added", account: who})
    (ok true)))

(define-public (remove-compliance-admin (who principal))
  (begin
    (asserts! (is-eq tx-sender (var-get protocol-admin-principal)) ERR-NOT-AUTHORIZED)
    (map-delete compliance-admins who)
    (print {event: "compliance-admin-removed", account: who})
    (ok true)))

;; ---------- public: emergency control ----------

;; Protocol-wide circuit breaker. When true, every rwa-token instance that
;; consults get-protocol-paused will refuse transfers, regardless of its own
;; pause state. Minting/burning by issuers is unaffected -- this switch only
;; protects against active transfer-level incidents.
(define-public (set-protocol-paused (paused bool))
  (begin
    (asserts! (is-eq tx-sender (var-get protocol-admin-principal)) ERR-NOT-AUTHORIZED)
    (var-set protocol-paused paused)
    (print {event: "protocol-pause-updated", paused: paused})
    (ok true)))

;; ---------- read-only ----------
(define-read-only (get-protocol-admin)
  (var-get protocol-admin-principal))

(define-read-only (get-protocol-paused)
  (var-get protocol-paused))
