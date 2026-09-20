;; sip-010-trait
;; Local copy of the standard SIP-010 fungible token trait.
;;
;; RWAForge token contracts implement this trait so any SIP-010-aware
;; wallet, explorer or dApp can read balances/metadata and submit transfers
;; in the standard shape. For mainnet/testnet deployments that need to
;; interoperate with the canonical, already-deployed SIP-010 trait contract,
;; swap the `impl-trait` target in rwa-token.clar for that principal --
;; the function signatures below are identical to the standard.

(define-trait sip-010-trait
  (
    ;; Transfer `amount` from `sender` to `recipient`. `tx-sender` must equal
    ;; `sender`. An optional memo may be attached for off-chain reference.
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; Human-readable token name.
    (get-name () (response (string-ascii 32) uint))

    ;; Ticker symbol.
    (get-symbol () (response (string-ascii 10) uint))

    ;; Number of decimal places.
    (get-decimals () (response uint uint))

    ;; Balance of a given principal.
    (get-balance (principal) (response uint uint))

    ;; Circulating supply.
    (get-total-supply () (response uint uint))

    ;; Optional off-chain metadata URI.
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
