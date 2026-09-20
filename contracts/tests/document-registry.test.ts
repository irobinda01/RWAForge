import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const issuer = accounts.get("wallet_1")!;
const outsider = accounts.get("wallet_3")!;

const ERR_NOT_AUTHORIZED = Cl.uint(100);
const ERR_NOT_FOUND = Cl.uint(101);
const ERR_RWA_NOT_FOUND = Cl.uint(102);
const ERR_INVALID_INPUT = Cl.uint(103);
const ERR_ALREADY_REVOKED = Cl.uint(104);

const DOC_TYPE_ASSET_DISCLOSURE = 0;
const DOC_TYPE_INVALID = 42;
const VISIBILITY_PUBLIC = 0;
const VISIBILITY_INVALID = 9;

const hash32 = Cl.buffer(new Uint8Array(32).fill(7));
const hashTooShort = Cl.buffer(new Uint8Array(16).fill(7));

function createRwa(sender = issuer) {
  return simnet.callPublicFn(
    "rwa-registry",
    "create-rwa",
    [
      Cl.stringAscii("GreenGrid Solar Infrastructure"),
      Cl.stringAscii("GGRID"),
      Cl.stringAscii("Infrastructure"),
      Cl.stringUtf8("desc"),
      Cl.stringAscii("US-TX"),
      Cl.none(),
    ],
    sender,
  );
}

describe("document-registry: registration", () => {
  it("rejects documents for a non-existent RWA", () => {
    const { result } = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(999), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    expect(result).toBeErr(ERR_RWA_NOT_FOUND);
  });

  it("lets the issuer register a document and returns an incrementing doc-id", () => {
    createRwa();
    const first = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc-1"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    expect(first.result).toBeOk(Cl.uint(0));

    const second = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc-2"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    expect(second.result).toBeOk(Cl.uint(1));
    expect(simnet.callReadOnlyFn("document-registry", "get-document-count", [], issuer).result).toBeUint(2);
  });

  it("rejects registration from a wallet that is not the RWA's issuer or protocol admin", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      outsider,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("lets the protocol admin register a document on behalf of the protocol", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      deployer,
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("rejects an out-of-range document type", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_INVALID), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });

  it("rejects an out-of-range visibility value", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_INVALID)],
      issuer,
    );
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });

  it("rejects a content hash shorter than 32 bytes", () => {
    createRwa();
    const { result } = simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hashTooShort, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });
});

describe("document-registry: revocation", () => {
  it("lets the uploader revoke their own document", () => {
    createRwa();
    simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    const { result } = simnet.callPublicFn("document-registry", "revoke-document", [Cl.uint(0)], issuer);
    expect(result).toBeOk(Cl.bool(true));

    const doc = simnet.callReadOnlyFn("document-registry", "get-document", [Cl.uint(0)], issuer);
    const tuple = (doc.result as any).value.value;
    expect(tuple.active).toStrictEqual(Cl.bool(false));
  });

  it("rejects revocation from an unrelated wallet", () => {
    createRwa();
    simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    const { result } = simnet.callPublicFn("document-registry", "revoke-document", [Cl.uint(0)], outsider);
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("rejects revoking an already-revoked document", () => {
    createRwa();
    simnet.callPublicFn(
      "document-registry",
      "add-document",
      [Cl.uint(0), hash32, Cl.stringUtf8("ipfs://doc"), Cl.uint(DOC_TYPE_ASSET_DISCLOSURE), Cl.uint(VISIBILITY_PUBLIC)],
      issuer,
    );
    simnet.callPublicFn("document-registry", "revoke-document", [Cl.uint(0)], issuer);
    const { result } = simnet.callPublicFn("document-registry", "revoke-document", [Cl.uint(0)], issuer);
    expect(result).toBeErr(ERR_ALREADY_REVOKED);
  });

  it("rejects revoking a document that does not exist", () => {
    const { result } = simnet.callPublicFn("document-registry", "revoke-document", [Cl.uint(999)], issuer);
    expect(result).toBeErr(ERR_NOT_FOUND);
  });
});
