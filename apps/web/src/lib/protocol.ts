// The full protocol picture -- not just the MVP. Used by the homepage's
// "full protocol" section and the docs page's contract reference so both
// pages tell the same accurate story from one source of truth. Every claim
// here mirrors docs/SMART-CONTRACTS.md, docs/ARCHITECTURE.md,
// docs/SECURITY.md, and docs/ROADMAP.md -- update those first, then this.

export type ContractStatus = "live" | "dormant";

export interface ProtocolContract {
  file: string;
  status: ContractStatus;
  title: string;
  summary: string;
  details: string[];
  keyFunctions: string[];
}

export const PROTOCOL_CONTRACTS: ProtocolContract[] = [
  {
    file: "token-market.clar",
    status: "live",
    title: "Token Market",
    summary: "Powers both MVP features today: create a token, and buy it with STX or sBTC. The only contract the frontend actually calls.",
    details: [
      "A single contract holds every created token's metadata and balances in maps, keyed by an auto-incrementing token-id, rather than deploying a fresh contract per token. Creating a token is one wallet signature, not three.",
      "A creator prices each token in STX, sBTC, or both, so Bitcoin holders can buy without swapping into STX first. purchase (STX) and purchase-with-sbtc (sBTC) are atomic: payment moves buyer → creator before any balance changes, and a failed payment rolls back everything in the same transaction — a Clarity VM guarantee, not application logic RWAForge implemented itself.",
      "No admin, no escrow, no protocol fee, and no general transfer function — balances only ever change via creation and purchase.",
    ],
    keyFunctions: [
      "create-token(name, symbol, description, category, total-supply, price-stx, price-sbtc)",
      "purchase(token-id, amount)",
      "purchase-with-sbtc(token-id, amount)",
      "get-token(token-id)",
      "get-balance(token-id, owner)",
    ],
  },
  {
    file: "rwa-registry.clar",
    status: "dormant",
    title: "RWA Registry",
    summary: "A richer per-asset registry — issuer, category, jurisdiction, and protocol-controlled verification status — than token-market's flat record.",
    details: [
      "Self-service creation (anyone can register an asset), but verification status can only move through unverified → pending → verified/rejected via the protocol admin or a registered compliance-admin — never the issuer themselves.",
      "Designed to link to a separately-deployed token contract via a one-time set-token-contract call, guarded so it can't be silently re-pointed later.",
    ],
    keyFunctions: [
      "create-rwa(name, symbol, category, description, jurisdiction, metadata-uri)",
      "update-rwa(rwa-id, description, jurisdiction, metadata-uri)",
      "set-token-contract(rwa-id, contract)",
      "update-verification-status(rwa-id, status)",
    ],
  },
  {
    file: "compliance-registry.clar",
    status: "dormant",
    title: "Compliance Registry",
    summary: "Per-asset, per-wallet investor eligibility — whitelisted, active/suspended, investor class, expiry — enforced at transfer time.",
    details: [
      "Never performs KYC itself and never stores personal data — only the eligibility decision an issuer (or a registered compliance-admin) already made off-chain.",
      "Scoped per (rwa-id, wallet): being whitelisted for one asset doesn't make a wallet eligible for another issuer's asset.",
    ],
    keyFunctions: [
      "add-investor(rwa-id, wallet, investor-class, jurisdiction, expiry-height)",
      "suspend-investor(rwa-id, wallet)",
      "batch-add-investors(rwa-id, entries)",
      "is-eligible(rwa-id, wallet)",
    ],
  },
  {
    file: "document-registry.clar",
    status: "dormant",
    title: "Document Registry",
    summary: "On-chain content-hash proof-of-existence for off-chain documents — disclosures, valuations, agreements — without storing the file itself.",
    details: [
      "Stores a SHA-256 content hash, an off-chain storage pointer, and a visibility classification (public/restricted/private).",
      "Revoking a document flips an active flag; nothing already registered is ever deleted, preserving the audit trail.",
    ],
    keyFunctions: [
      "add-document(rwa-id, content-hash, metadata-uri, doc-type, visibility)",
      "revoke-document(doc-id)",
      "get-document(doc-id)",
    ],
  },
  {
    file: "protocol-admin.clar",
    status: "dormant",
    title: "Protocol Admin",
    summary: "A minimal role registry and emergency transfer-pause circuit breaker — deliberately unable to move funds, mint, or burn on anyone's behalf.",
    details: [
      "Can reassign itself, manage a compliance-admin registry, and flip a protocol-wide transfer pause. That is the entire privilege surface — no fund custody, ever.",
    ],
    keyFunctions: ["set-protocol-admin(new-admin)", "add-compliance-admin(who)", "set-protocol-paused(paused)"],
  },
  {
    file: "rwa-token.clar",
    status: "dormant",
    title: "RWA Token",
    summary: "A SIP-010 fungible token template meant to be deployed once per asset, with issuer-gated mint/burn/pause and compliance-checked transfers.",
    details: [
      "Every transfer checks pause state, protocol-pause state, and — when transfer-restricted — both parties' eligibility against compliance-registry, before moving a single token.",
      "Clarity has no runtime contract factory, so this file is used as a template: a real per-asset deployment rewrites its .compliance-registry / .protocol-admin references to the protocol's actual deployed addresses before broadcasting.",
    ],
    keyFunctions: ["initialize(...)", "mint(amount, recipient)", "burn(amount, holder)", "transfer(amount, sender, recipient, memo)"],
  },
  {
    file: "sip-010-trait.clar",
    status: "dormant",
    title: "SIP-010 Trait",
    summary: "A local copy of the standard SIP-010 fungible token trait, implemented by rwa-token.clar so any SIP-010-aware wallet or explorer can read it.",
    details: ["Pure interface definition — no state, no logic. Exists only so rwa-token.clar can impl-trait against the standard shape."],
    keyFunctions: ["get-name()", "get-symbol()", "get-balance(who)", "get-total-supply()"],
  },
];

export type RoadmapStatus = "infra-ready" | "planned";

export interface RoadmapItem {
  label: string;
  status: RoadmapStatus;
  note: string;
}

export const ROADMAP_ITEMS: RoadmapItem[] = [
  { label: "Investor compliance / eligibility whitelisting", status: "infra-ready", note: "compliance-registry.clar exists, tested, unused by the MVP" },
  { label: "Document integrity & disclosures", status: "infra-ready", note: "document-registry.clar exists, tested, unused by the MVP" },
  { label: "Protocol-controlled asset verification", status: "infra-ready", note: "rwa-registry.clar exists, tested, unused by the MVP" },
  { label: "Per-asset deployed SIP-010 tokens", status: "infra-ready", note: "rwa-token.clar template exists, tested, unused by the MVP" },
  { label: "Secondary marketplace / resale", status: "planned", note: "Not started — token-market has no transfer function yet" },
  { label: "DAO governance of the protocol", status: "planned", note: "Not started" },
  { label: "Deeper Bitcoin-native settlement, beyond sBTC payments", status: "planned", note: "sBTC purchases are live today; anything further (e.g. an STX/BTC price oracle) is not started" },
  { label: "Mainnet deployment", status: "planned", note: "Needs a third-party contract audit first" },
];
