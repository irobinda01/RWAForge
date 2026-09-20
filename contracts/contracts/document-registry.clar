;; document-registry
;; On-chain proof-of-existence for off-chain RWA documentation.
;;
;; Actual files (PDFs, spreadsheets, images) are never stored on-chain.
;; This contract stores only: a SHA-256 content hash, a pointer
;; (metadata-uri) to where the file/metadata can be fetched off-chain, a
;; document type/visibility classification, and audit fields. The frontend
;; verifies a downloaded document's integrity by re-hashing it and
;; comparing against `content-hash`.

;; ---------- error constants ----------
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-NOT-FOUND (err u101))
(define-constant ERR-RWA-NOT-FOUND (err u102))
(define-constant ERR-INVALID-INPUT (err u103))
(define-constant ERR-ALREADY-REVOKED (err u104))

;; ---------- document type enum ----------
(define-constant DOC-TYPE-ASSET-DISCLOSURE u0)
(define-constant DOC-TYPE-LEGAL-AGREEMENT u1)
(define-constant DOC-TYPE-VALUATION u2)
(define-constant DOC-TYPE-FINANCIAL-STATEMENT u3)
(define-constant DOC-TYPE-AUDIT-REPORT u4)
(define-constant DOC-TYPE-OFFERING-MEMORANDUM u5)
(define-constant DOC-TYPE-OTHER u6)

;; ---------- visibility enum ----------
(define-constant VISIBILITY-PUBLIC u0)
(define-constant VISIBILITY-RESTRICTED u1)
(define-constant VISIBILITY-PRIVATE u2)

;; ---------- state ----------
(define-data-var next-doc-id uint u0)

(define-map documents
  uint
  {
    rwa-id: uint,
    content-hash: (buff 32),
    metadata-uri: (string-utf8 256),
    doc-type: uint,
    visibility: uint,
    uploader: principal,
    created-at: uint,
    active: bool
  })

;; ---------- authorization ----------
(define-private (is-doc-manager (rwa-id uint) (who principal))
  (or
    (is-eq (some who) (contract-call? .rwa-registry get-issuer rwa-id))
    (contract-call? .protocol-admin is-protocol-admin who)))

;; ---------- public ----------

(define-public (add-document
    (rwa-id uint)
    (content-hash (buff 32))
    (metadata-uri (string-utf8 256))
    (doc-type uint)
    (visibility uint))
  (let ((doc-id (var-get next-doc-id)))
    (asserts! (is-some (contract-call? .rwa-registry get-issuer rwa-id)) ERR-RWA-NOT-FOUND)
    (asserts! (is-doc-manager rwa-id tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (<= doc-type DOC-TYPE-OTHER) ERR-INVALID-INPUT)
    (asserts! (<= visibility VISIBILITY-PRIVATE) ERR-INVALID-INPUT)
    (asserts! (is-eq (len content-hash) u32) ERR-INVALID-INPUT)
    (map-set documents doc-id {
      rwa-id: rwa-id,
      content-hash: content-hash,
      metadata-uri: metadata-uri,
      doc-type: doc-type,
      visibility: visibility,
      uploader: tx-sender,
      created-at: stacks-block-height,
      active: true
    })
    (var-set next-doc-id (+ doc-id u1))
    (print {event: "document-added", doc-id: doc-id, rwa-id: rwa-id, doc-type: doc-type, visibility: visibility})
    (ok doc-id)))

(define-public (revoke-document (doc-id uint))
  (let ((doc (unwrap! (map-get? documents doc-id) ERR-NOT-FOUND)))
    (asserts! (or (is-eq tx-sender (get uploader doc)) (is-doc-manager (get rwa-id doc) tx-sender)) ERR-NOT-AUTHORIZED)
    (asserts! (get active doc) ERR-ALREADY-REVOKED)
    (map-set documents doc-id (merge doc {active: false}))
    (print {event: "document-revoked", doc-id: doc-id, rwa-id: (get rwa-id doc)})
    (ok true)))

;; ---------- read-only ----------

(define-read-only (get-document (doc-id uint))
  (map-get? documents doc-id))

(define-read-only (get-document-count)
  (var-get next-doc-id))
