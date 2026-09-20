import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const ERR_NOT_AUTHORIZED = Cl.uint(100);

describe("protocol-admin: role bootstrap", () => {
  it("sets the deployer as the initial protocol admin", () => {
    const { result } = simnet.callReadOnlyFn("protocol-admin", "get-protocol-admin", [], deployer);
    expect(result).toBePrincipal(deployer);
  });

  it("reports the protocol as unpaused by default", () => {
    const { result } = simnet.callReadOnlyFn("protocol-admin", "get-protocol-paused", [], deployer);
    expect(result).toBeBool(false);
  });
});

describe("protocol-admin: admin transfer", () => {
  it("rejects set-protocol-admin from a non-admin", () => {
    const { result } = simnet.callPublicFn(
      "protocol-admin",
      "set-protocol-admin",
      [Cl.principal(wallet1)],
      wallet1,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("allows the current admin to transfer the role", () => {
    const { result } = simnet.callPublicFn(
      "protocol-admin",
      "set-protocol-admin",
      [Cl.principal(wallet1)],
      deployer,
    );
    expect(result).toBeOk(Cl.bool(true));

    const check = simnet.callReadOnlyFn("protocol-admin", "get-protocol-admin", [], deployer);
    expect(check.result).toBePrincipal(wallet1);
  });

  it("revokes the old admin's privileges once the role has moved", () => {
    simnet.callPublicFn("protocol-admin", "set-protocol-admin", [Cl.principal(wallet1)], deployer);

    const { result } = simnet.callPublicFn(
      "protocol-admin",
      "set-protocol-paused",
      [Cl.bool(true)],
      deployer,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });
});

describe("protocol-admin: compliance-admin registry", () => {
  it("rejects add-compliance-admin from a non-admin", () => {
    const { result } = simnet.callPublicFn(
      "protocol-admin",
      "add-compliance-admin",
      [Cl.principal(wallet2)],
      wallet1,
    );
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("lets the protocol admin register and remove a compliance admin", () => {
    const add = simnet.callPublicFn(
      "protocol-admin",
      "add-compliance-admin",
      [Cl.principal(wallet2)],
      deployer,
    );
    expect(add.result).toBeOk(Cl.bool(true));

    const isAdmin = simnet.callReadOnlyFn("protocol-admin", "is-compliance-admin", [Cl.principal(wallet2)], deployer);
    expect(isAdmin.result).toBeBool(true);

    const remove = simnet.callPublicFn(
      "protocol-admin",
      "remove-compliance-admin",
      [Cl.principal(wallet2)],
      deployer,
    );
    expect(remove.result).toBeOk(Cl.bool(true));

    const isAdminAfter = simnet.callReadOnlyFn("protocol-admin", "is-compliance-admin", [Cl.principal(wallet2)], deployer);
    expect(isAdminAfter.result).toBeBool(false);
  });
});

describe("protocol-admin: emergency pause", () => {
  it("rejects set-protocol-paused from a non-admin", () => {
    const { result } = simnet.callPublicFn("protocol-admin", "set-protocol-paused", [Cl.bool(true)], wallet1);
    expect(result).toBeErr(ERR_NOT_AUTHORIZED);
  });

  it("lets the protocol admin toggle the global pause switch", () => {
    const on = simnet.callPublicFn("protocol-admin", "set-protocol-paused", [Cl.bool(true)], deployer);
    expect(on.result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("protocol-admin", "get-protocol-paused", [], deployer).result).toBeBool(true);

    const off = simnet.callPublicFn("protocol-admin", "set-protocol-paused", [Cl.bool(false)], deployer);
    expect(off.result).toBeOk(Cl.bool(true));
    expect(simnet.callReadOnlyFn("protocol-admin", "get-protocol-paused", [], deployer).result).toBeBool(false);
  });
});
