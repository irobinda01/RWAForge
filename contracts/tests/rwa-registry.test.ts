import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const issuer = accounts.get("wallet_1")!;
const otherIssuer = accounts.get("wallet_2")!;
const outsider = accounts.get("wallet_3")!;

const ERR_NOT_FOUND = Cl.uint(101);
const ERR_NOT_ISSUER = Cl.uint(102);
const ERR_ALREADY_SET = Cl.uint(103);
const ERR_INVALID_STATUS = Cl.uint(104);
const ERR_INVALID_INPUT = Cl.uint(105);
const ERR_NOT_AUTHORIZED = Cl.uint(100);

function createRwa(sender = issuer) {
  return simnet.callPublicFn(
    "rwa-registry",
    "create-rwa",
    [
      Cl.stringAscii("Atlas Heights Residences"),
      Cl.stringAscii("ATLAS"),
      Cl.stringAscii("Real Estate"),
      Cl.stringUtf8("A demo multifamily residential asset."),
      Cl.stringAscii("US-DE"),
      Cl.some(Cl.stringUtf8("ipfs://demo-metadata")),
    ],
    sender,
  );
}

describe("rwa-registry: creation", () => {
  it("creates an RWA and assigns the caller as issuer", () => {
    const { result } = createRwa();
    expect(result).toBeOk(Cl.uint(0));

    const { result: rwa } = simnet.callReadOnlyFn("rwa-registry", "get-rwa", [Cl.uint(0)], issuer);
    expect(rwa).toBeSome(
      Cl.tuple({
        issuer: Cl.principal(issuer),
        "asset-name": Cl.stringAscii("Atlas Heights Residences"),
        "asset-symbol": Cl.stringAscii("ATLAS"),
        "asset-category": Cl.stringAscii("Real Estate"),
        description: Cl.stringUtf8("A demo multifamily residential asset."),
        jurisdiction: Cl.stringAscii("US-DE"),
        "token-contract": Cl.none(),
        "metadata-uri": Cl.some(Cl.stringUtf8("ipfs://demo-metadata")),
        "verification-status": Cl.uint(0),
        active: Cl.bool(true),
        "created-at": Cl.uint(simnet.blockHeight),
        "updated-at": Cl.uint(simnet.blockHeight),
      }),
    );
  });

  it("increments the RWA id for each new asset, scoped to no single issuer", () => {
    createRwa(issuer);
    createRwa(otherIssuer);
    const { result } = simnet.callReadOnlyFn("rwa-registry", "get-rwa-count", [], issuer);
    expect(result).toBeUint(2);
  });

  it("rejects an empty asset name", () => {
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "create-rwa",
      [
        Cl.stringAscii(""),
        Cl.stringAscii("ATLAS"),
        Cl.stringAscii("Real Estate"),
        Cl.stringUtf8("desc"),
        Cl.stringAscii("US-DE"),
        Cl.none(),
      ],
      issuer,
    );
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });
});

describe("rwa-registry: updates", () => {
  it("lets the issuer update mutable fields", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "update-rwa",
      [Cl.uint(0), Cl.stringUtf8("Updated description"), Cl.stringAscii("US-CA"), Cl.none()],
      issuer,
    );
    expect(result).toBeOk(Cl.bool(true));

    const { result: rwa } = simnet.callReadOnlyFn("rwa-registry", "get-rwa", [Cl.uint(0)], issuer);
    const tuple = (rwa as any).value.value;
    expect(tuple.description).toStrictEqual(Cl.stringUtf8("Updated description"));
    expect(tuple.jurisdiction).toStrictEqual(Cl.stringAscii("US-CA"));
  });

  it("rejects updates from a non-issuer wallet", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "update-rwa",
      [Cl.uint(0), Cl.stringUtf8("Malicious edit"), Cl.stringAscii("US-CA"), Cl.none()],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_ISSUER);
  });

  it("rejects updates to a non-existent RWA", () => {
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "update-rwa",
      [Cl.uint(999), Cl.stringUtf8("x"), Cl.stringAscii("US-CA"), Cl.none()],
      issuer,
    );
    expect(result).toBeErr(ERR_NOT_FOUND);
  });
});

describe("rwa-registry: token contract linkage", () => {
  it("lets the issuer link a token contract exactly once", () => {
    createRwa();
    const first = simnet.callPublicFn(
      "rwa-registry",
      "set-token-contract",
      [Cl.uint(0), Cl.principal(`${deployer}.rwa-token`)],
      issuer,
    );
    expect(first.result).toBeOk(Cl.bool(true));

    const second = simnet.callPublicFn(
      "rwa-registry",
      "set-token-contract",
      [Cl.uint(0), Cl.principal(`${deployer}.rwa-token`)],
      issuer,
    );
    expect(second.result).toBeErr(ERR_ALREADY_SET);
  });

  it("rejects linkage from a non-issuer", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "set-token-contract",
      [Cl.uint(0), Cl.principal(`${deployer}.rwa-token`)],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_ISSUER);
  });
});

describe("rwa-registry: activation state", () => {
  it("lets the issuer deactivate and reactivate their own asset", () => {
    createRwa();
    const deactivate = simnet.callPublicFn("rwa-registry", "deactivate-rwa", [Cl.uint(0)], issuer);
    expect(deactivate.result).toBeOk(Cl.bool(true));

    const reactivate = simnet.callPublicFn("rwa-registry", "reactivate-rwa", [Cl.uint(0)], issuer);
    expect(reactivate.result).toBeOk(Cl.bool(true));
  });

  it("lets the protocol admin deactivate any asset", () => {
    createRwa();
    const { result } = simnet.callPublicFn("rwa-registry", "deactivate-rwa", [Cl.uint(0)], deployer);
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects deactivation from an unrelated wallet", () => {
    createRwa();
    const { result } = simnet.callPublicFn("rwa-registry", "deactivate-rwa", [Cl.uint(0)], outsider);
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });
});

describe("rwa-registry: verification (protocol-controlled)", () => {
  it("rejects verification updates from an unauthorized wallet, including the issuer themselves", () => {
    createRwa();
    const fromOutsider = simnet.callPublicFn(
      "rwa-registry",
      "update-verification-status",
      [Cl.uint(0), Cl.uint(2)],
      outsider,
    );
    expect(fromOutsider.result).toBeErr(ERR_NOT_AUTHORIZED);

    const fromIssuer = simnet.callPublicFn(
      "rwa-registry",
      "update-verification-status",
      [Cl.uint(0), Cl.uint(2)],
      issuer,
    );
    expect(fromIssuer.result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("lets the protocol admin move an asset through verification states", () => {
    createRwa();
    const toPending = simnet.callPublicFn(
      "rwa-registry",
      "update-verification-status",
      [Cl.uint(0), Cl.uint(1)],
      deployer,
    );
    expect(toPending.result).toBeOk(Cl.bool(true));

    const toVerified = simnet.callPublicFn(
      "rwa-registry",
      "update-verification-status",
      [Cl.uint(0), Cl.uint(2)],
      deployer,
    );
    expect(toVerified.result).toBeOk(Cl.bool(true));

    const { result: rwa } = simnet.callReadOnlyFn("rwa-registry", "get-rwa", [Cl.uint(0)], deployer);
    const tuple = (rwa as any).value.value;
    expect(tuple["verification-status"]).toStrictEqual(Cl.uint(2));
  });

  it("lets a registered compliance-admin (not just the protocol admin) verify an asset", () => {
    createRwa();
    simnet.callPublicFn("protocol-admin", "add-compliance-admin", [Cl.principal(outsider)], deployer);
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "update-verification-status",
      [Cl.uint(0), Cl.uint(2)],
      outsider,
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects an out-of-range verification status", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "rwa-registry",
      "update-verification-status",
      [Cl.uint(0), Cl.uint(9)],
      deployer,
    );
    expect(result).toBeErr(ERR_INVALID_STATUS);
  });
});
