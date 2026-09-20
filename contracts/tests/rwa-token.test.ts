import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
// rwa-token.clar's DEPLOYER constant is captured at contract-deploy time, which
// happens once at simnet boot with `deployer` as tx-sender. So for these tests
// the token's issuer is necessarily `deployer` -- mirroring an issuer who
// deploys both their RWA profile and its token contract from the same wallet.
const issuer = deployer;
const investorA = accounts.get("wallet_1")!;
const investorB = accounts.get("wallet_2")!;
const outsider = accounts.get("wallet_3")!;

const ERR_NOT_AUTHORIZED = Cl.uint(100);
const ERR_NOT_ISSUER = Cl.uint(101);
const ERR_ALREADY_INITIALIZED = Cl.uint(102);
const ERR_PAUSED = Cl.uint(104);
const ERR_NOT_ELIGIBLE_SENDER = Cl.uint(106);
const ERR_NOT_ELIGIBLE_RECIPIENT = Cl.uint(107);
const ERR_MINTING_DISABLED = Cl.uint(108);
const ERR_BURNING_DISABLED = Cl.uint(109);
const ERR_MAX_SUPPLY_EXCEEDED = Cl.uint(110);
const ERR_INVALID_AMOUNT = Cl.uint(111);

const MAX_SUPPLY = 1_000_000_000;
const INITIAL_SUPPLY = 100_000_000;

function createRwa() {
  return simnet.callPublicFn(
    "rwa-registry",
    "create-rwa",
    [
      Cl.stringAscii("AgriYield Farm Portfolio"),
      Cl.stringAscii("AGRI"),
      Cl.stringAscii("Agriculture"),
      Cl.stringUtf8("desc"),
      Cl.stringAscii("US-IA"),
      Cl.none(),
    ],
    issuer,
  );
}

function initToken(overrides: Partial<{
  maxSupply: number;
  initialSupply: number;
  initialHolder: string;
  mintable: boolean;
  burnable: boolean;
  restricted: boolean;
}> = {}) {
  const opts = {
    maxSupply: MAX_SUPPLY,
    initialSupply: INITIAL_SUPPLY,
    initialHolder: issuer,
    mintable: true,
    burnable: true,
    restricted: true,
    ...overrides,
  };
  return simnet.callPublicFn(
    "rwa-token",
    "initialize",
    [
      Cl.uint(0),
      Cl.stringAscii("AgriYield Token"),
      Cl.stringAscii("AGRI"),
      Cl.uint(6),
      Cl.none(),
      Cl.uint(opts.maxSupply),
      Cl.uint(opts.initialSupply),
      Cl.principal(opts.initialHolder),
      Cl.bool(opts.mintable),
      Cl.bool(opts.burnable),
      Cl.bool(opts.restricted),
    ],
    issuer,
  );
}

function whitelist(wallet: string, rwaId = 0) {
  return simnet.callPublicFn(
    "compliance-registry",
    "add-investor",
    [Cl.uint(rwaId), Cl.principal(wallet), Cl.uint(1), Cl.none(), Cl.none()],
    issuer,
  );
}

describe("rwa-token: initialization", () => {
  it("mints the initial supply to the initial holder and records config", () => {
    createRwa();
    const { result } = initToken();
    expect(result).toBeOk(Cl.bool(true));

    const balance = simnet.callReadOnlyFn("rwa-token", "get-balance", [Cl.principal(issuer)], issuer);
    expect(balance.result).toBeOk(Cl.uint(INITIAL_SUPPLY));

    const supply = simnet.callReadOnlyFn("rwa-token", "get-total-supply", [], issuer);
    expect(supply.result).toBeOk(Cl.uint(INITIAL_SUPPLY));
  });

  it("rejects a second initialize call", () => {
    createRwa();
    initToken();
    const { result } = initToken();
    expect(result).toBeErr(ERR_ALREADY_INITIALIZED);
  });

  it("rejects initial supply above max supply", () => {
    createRwa();
    const { result } = initToken({ maxSupply: 100, initialSupply: 200 });
    expect(result).toBeErr(ERR_MAX_SUPPLY_EXCEEDED);
  });
});

describe("rwa-token: minting", () => {
  it("lets the issuer mint within the supply cap", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(1000), Cl.principal(investorA)], issuer);
    expect(result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("rwa-token", "get-balance", [Cl.principal(investorA)], issuer).result).toBeOk(Cl.uint(1000));
  });

  it("rejects minting from a non-issuer wallet", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(1000), Cl.principal(investorA)], outsider);
    expect(result).toBeErr(ERR_NOT_ISSUER);
  });

  it("enforces the max-supply cap", () => {
    createRwa();
    initToken({ maxSupply: INITIAL_SUPPLY + 500 });
    const overCap = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(501), Cl.principal(investorA)], issuer);
    expect(overCap.result).toBeErr(ERR_MAX_SUPPLY_EXCEEDED);

    const withinCap = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(500), Cl.principal(investorA)], issuer);
    expect(withinCap.result).toBeOk(Cl.bool(true));
  });

  it("allows unlimited minting when max-supply is 0 (uncapped)", () => {
    createRwa();
    initToken({ maxSupply: 0 });
    const { result } = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(50_000_000), Cl.principal(investorA)], issuer);
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects minting when mint is disabled", () => {
    createRwa();
    initToken({ mintable: false });
    const { result } = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(10), Cl.principal(investorA)], issuer);
    expect(result).toBeErr(ERR_MINTING_DISABLED);
  });

  it("rejects a zero-amount mint", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn("rwa-token", "mint", [Cl.uint(0), Cl.principal(investorA)], issuer);
    expect(result).toBeErr(ERR_INVALID_AMOUNT);
  });
});

describe("rwa-token: burning", () => {
  it("lets a holder burn their own tokens", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn("rwa-token", "burn", [Cl.uint(1000), Cl.principal(issuer)], issuer);
    expect(result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("rwa-token", "get-balance", [Cl.principal(issuer)], issuer).result).toBeOk(
      Cl.uint(INITIAL_SUPPLY - 1000),
    );
  });

  it("lets the issuer force-burn from another holder's balance (redemption)", () => {
    createRwa();
    initToken();
    whitelist(investorA);
    whitelist(issuer);
    simnet.callPublicFn("rwa-token", "transfer", [Cl.uint(5000), Cl.principal(issuer), Cl.principal(investorA), Cl.none()], issuer);

    const { result } = simnet.callPublicFn("rwa-token", "burn", [Cl.uint(2000), Cl.principal(investorA)], issuer);
    expect(result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("rwa-token", "get-balance", [Cl.principal(investorA)], issuer).result).toBeOk(Cl.uint(3000));
  });

  it("rejects a third party burning someone else's tokens", () => {
    createRwa();
    initToken();
    whitelist(investorA);
    whitelist(issuer);
    simnet.callPublicFn("rwa-token", "transfer", [Cl.uint(5000), Cl.principal(issuer), Cl.principal(investorA), Cl.none()], issuer);

    const { result } = simnet.callPublicFn("rwa-token", "burn", [Cl.uint(1000), Cl.principal(investorA)], outsider);
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("rejects burning when burn is disabled", () => {
    createRwa();
    initToken({ burnable: false });
    const { result } = simnet.callPublicFn("rwa-token", "burn", [Cl.uint(1000), Cl.principal(issuer)], issuer);
    expect(result).toBeErr(ERR_BURNING_DISABLED);
  });
});

describe("rwa-token: compliant transfers", () => {
  it("rejects a transfer when the sender is not whitelisted", () => {
    createRwa();
    initToken();
    whitelist(investorA);
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(result).toBeErr(ERR_NOT_ELIGIBLE_SENDER);
  });

  it("rejects a transfer when the recipient is not whitelisted", () => {
    createRwa();
    initToken();
    whitelist(issuer);
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(result).toBeErr(ERR_NOT_ELIGIBLE_RECIPIENT);
  });

  it("allows a transfer once both parties are whitelisted", () => {
    createRwa();
    initToken();
    whitelist(issuer);
    whitelist(investorA);
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(2500), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("rwa-token", "get-balance", [Cl.principal(investorA)], issuer).result).toBeOk(Cl.uint(2500));
  });

  it("skips the whitelist check entirely once transfer-restricted is disabled", () => {
    createRwa();
    initToken();
    simnet.callPublicFn("rwa-token", "set-transfer-restricted", [Cl.bool(false)], issuer);
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects impersonated transfers where tx-sender != sender", () => {
    createRwa();
    initToken();
    whitelist(issuer);
    whitelist(investorA);
    simnet.callPublicFn("rwa-token", "transfer", [Cl.uint(1000), Cl.principal(issuer), Cl.principal(investorA), Cl.none()], issuer);

    const { result } = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(500), Cl.principal(investorA), Cl.principal(outsider), Cl.none()],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });
});

describe("rwa-token: pause controls", () => {
  it("rejects transfers while the token is paused, and allows them again after unpause", () => {
    createRwa();
    initToken();
    whitelist(issuer);
    whitelist(investorA);

    simnet.callPublicFn("rwa-token", "pause", [], issuer);
    const whilePaused = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(whilePaused.result).toBeErr(ERR_PAUSED);

    simnet.callPublicFn("rwa-token", "unpause", [], issuer);
    const afterUnpause = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(afterUnpause.result).toBeOk(Cl.bool(true));
  });

  it("rejects pause/unpause from a non-issuer wallet", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn("rwa-token", "pause", [], outsider);
    expect(result).toBeErr(ERR_NOT_ISSUER);
  });

  it("blocks transfers protocol-wide when the emergency pause is engaged, even on an unpaused token", () => {
    createRwa();
    initToken();
    whitelist(issuer);
    whitelist(investorA);

    simnet.callPublicFn("protocol-admin", "set-protocol-paused", [Cl.bool(true)], deployer);
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(result).toBeErr(Cl.uint(105));

    simnet.callPublicFn("protocol-admin", "set-protocol-paused", [Cl.bool(false)], deployer);
    const afterLift = simnet.callPublicFn(
      "rwa-token",
      "transfer",
      [Cl.uint(100), Cl.principal(issuer), Cl.principal(investorA), Cl.none()],
      issuer,
    );
    expect(afterLift.result).toBeOk(Cl.bool(true));
  });
});

describe("rwa-token: metadata and settings", () => {
  it("lets the issuer update the token URI", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "set-token-uri",
      [Cl.some(Cl.stringUtf8("ipfs://new-metadata"))],
      issuer,
    );
    expect(result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("rwa-token", "get-token-uri", [], issuer).result).toBeOk(Cl.some(Cl.stringUtf8("ipfs://new-metadata")));
  });

  it("rejects metadata updates from a non-issuer wallet", () => {
    createRwa();
    initToken();
    const { result } = simnet.callPublicFn(
      "rwa-token",
      "set-token-uri",
      [Cl.some(Cl.stringUtf8("ipfs://malicious"))],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_ISSUER);
  });
});
