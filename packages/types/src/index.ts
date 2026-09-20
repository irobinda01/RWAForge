// Shared domain types for RWAForge.
//
// RWAForge MVP scope: create a token on the Stacks Testnet, and purchase an
// available token with real testnet STX or sBTC. Every field here maps directly to
// either on-chain state read from `token-market.clar`, or to plain client
// UI state (wallet session, transaction lifecycle). There is no off-chain
// database in this MVP -- the blockchain is the sole source of truth.

export type StacksNetworkName = "mainnet" | "testnet" | "devnet";

export const TOKEN_CATEGORIES = [
  "Real Estate",
  "Agriculture",
  "Business",
  "Infrastructure",
  "Other",
] as const;
export type TokenCategory = (typeof TOKEN_CATEGORIES)[number];

/** The assets a buyer can pay in. STX has 6 decimals, sBTC has 8. */
export const PAYMENT_ASSETS = ["STX", "sBTC"] as const;
export type PaymentAsset = (typeof PAYMENT_ASSETS)[number];

/**
 * A token as read directly from `token-market.clar`. Every field here is
 * on-chain and independently verifiable, except `description` and
 * `category`, which are creator-supplied claims stored on-chain verbatim
 * but never independently verified by RWAForge -- see the "Creator-provided
 * vs. on-chain verified" split rendered on the token detail page.
 */
export interface MarketToken {
  id: number;
  creator: string;
  name: string;
  symbol: string;
  description: string;
  category: TokenCategory | string;
  totalSupply: string; // bigint-as-string, whole tokens (no decimals)
  availableSupply: string; // bigint-as-string
  priceMicroStx: string; // bigint-as-string, price per whole token in micro-STX; "0" = STX not accepted
  priceSats: string; // bigint-as-string, price per whole token in sats (1e-8 sBTC); "0" = sBTC not accepted
  createdAtBlock: number;
  network: StacksNetworkName;
}

// ---------------------------------------------------------------------------
// Wallet / transaction lifecycle
// ---------------------------------------------------------------------------

export type TransactionState =
  | "idle"
  | "preparing"
  | "awaiting-wallet"
  | "broadcasting"
  | "confirming"
  | "confirmed"
  | "failed";

export interface WalletSession {
  address: string;
  network: StacksNetworkName;
}
