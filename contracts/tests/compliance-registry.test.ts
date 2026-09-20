import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const issuer = accounts.get("wallet_1")!;
const investor = accounts.get("wallet_2")!;
const outsider = accounts.get("wallet_3")!;
const complianceAdmin = accounts.get("wallet_4")!;

const ERR_NOT_AUTHORIZED = Cl.uint(100);
const ERR_NOT_FOUND = Cl.uint(101);
const ERR_RWA_NOT_FOUND = Cl.uint(102);
const ERR_INVALID_INPUT = Cl.uint(103);

const CLASS_ACCREDITED = 1;

function createRwa(sender = issuer) {
  return simnet.callPublicFn(
    "rwa-registry",
    "create-rwa",
    [
      Cl.stringAscii("Northstar Private Credit Fund"),
      Cl.stringAscii("NSPC"),
      Cl.stringAscii("Private Credit"),
      Cl.stringUtf8("desc"),
      Cl.stringAscii("US-NY"),
      Cl.none(),
    ],
    sender,
  );
}

describe("compliance-registry: authorization", () => {
  it("rejects add-investor when the RWA does not exist", () => {
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(999), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      issuer,
    );
    expect(result).toBeErr(ERR_RWA_NOT_FOUND);
  });

  it("rejects add-investor from a wallet that is neither the issuer nor a compliance admin", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("allows the RWA's own issuer to manage its whitelist", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      issuer,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("allows a protocol-registered compliance admin to manage any RWA's whitelist", () => {
    createRwa();
    simnet.callPublicFn("protocol-admin", "add-compliance-admin", [Cl.principal(complianceAdmin)], deployer);
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      complianceAdmin,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects an out-of-range investor class", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(99), Cl.none(), Cl.none()],
      issuer,
    );
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });
});

describe("compliance-registry: whitelist lifecycle", () => {
  it("marks a newly added investor as eligible", () => {
    createRwa();
    simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      issuer,
    );
    const { result } = simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(result).toBeBool(true);
  });

  it("removes eligibility entirely on remove-investor", () => {
    createRwa();
    simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      issuer,
    );
    const remove = simnet.callPublicFn("compliance-registry", "remove-investor", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(remove.result).toBeOk(Cl.bool(true));

    const eligible = simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(eligible.result).toBeBool(false);

    const entry = simnet.callReadOnlyFn("compliance-registry", "get-eligibility", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(entry.result).toBeNone();
  });

  it("rejects removing a wallet that was never whitelisted", () => {
    createRwa();
    const { result } = simnet.callPublicFn("compliance-registry", "remove-investor", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(result).toBeErr(ERR_NOT_FOUND);
  });

  it("suspends and reinstates a whitelisted investor", () => {
    createRwa();
    simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      issuer,
    );

    const suspend = simnet.callPublicFn("compliance-registry", "suspend-investor", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(suspend.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer).result,
    ).toBeBool(false);

    const reinstate = simnet.callPublicFn("compliance-registry", "reinstate-investor", [Cl.uint(0), Cl.principal(investor)], issuer);
    expect(reinstate.result).toBeOk(Cl.bool(true));
    expect(
      simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer).result,
    ).toBeBool(true);
  });

  it("treats an expired entry as ineligible", () => {
    createRwa();
    const expiryHeight = simnet.blockHeight + 1;
    simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.some(Cl.uint(expiryHeight))],
      issuer,
    );
    expect(
      simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer).result,
    ).toBeBool(true);

    simnet.mineEmptyBlocks(5);

    expect(
      simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer).result,
    ).toBeBool(false);
  });

  it("scopes eligibility per RWA: whitelisting for one asset does not grant eligibility on another", () => {
    createRwa(issuer); // rwa-id 0
    createRwa(issuer); // rwa-id 1
    simnet.callPublicFn(
      "compliance-registry",
      "add-investor",
      [Cl.uint(0), Cl.principal(investor), Cl.uint(CLASS_ACCREDITED), Cl.none(), Cl.none()],
      issuer,
    );
    expect(
      simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(investor)], issuer).result,
    ).toBeBool(true);
    expect(
      simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(1), Cl.principal(investor)], issuer).result,
    ).toBeBool(false);
  });
});

describe("compliance-registry: batch import", () => {
  it("adds multiple investors in a single transaction", () => {
    createRwa();
    const w5 = accounts.get("wallet_5")!;
    const w6 = accounts.get("wallet_6")!;
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "batch-add-investors",
      [
        Cl.uint(0),
        Cl.list([
          Cl.tuple({ wallet: Cl.principal(w5), "investor-class": Cl.uint(0), jurisdiction: Cl.none(), "expiry-height": Cl.none() }),
          Cl.tuple({ wallet: Cl.principal(w6), "investor-class": Cl.uint(2), jurisdiction: Cl.none(), "expiry-height": Cl.none() }),
        ]),
      ],
      issuer,
    );
    expect(result).toBeOk(Cl.uint(2));
    expect(simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(w5)], issuer).result).toBeBool(true);
    expect(simnet.callReadOnlyFn("compliance-registry", "is-eligible", [Cl.uint(0), Cl.principal(w6)], issuer).result).toBeBool(true);
  });

  it("rejects a batch import from an unauthorized wallet", () => {
    createRwa();
    const w5 = accounts.get("wallet_5")!;
    const { result } = simnet.callPublicFn(
      "compliance-registry",
      "batch-add-investors",
      [Cl.uint(0), Cl.list([Cl.tuple({ wallet: Cl.principal(w5), "investor-class": Cl.uint(0), jurisdiction: Cl.none(), "expiry-height": Cl.none() })])],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });
});
