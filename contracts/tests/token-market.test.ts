import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const creator = accounts.get("wallet_1")!;
const otherCreator = accounts.get("wallet_2")!;
const buyer = accounts.get("wallet_3")!;
const otherBuyer = accounts.get("wallet_4")!;

const ERR_NOT_FOUND = Cl.uint(100);
const ERR_INVALID_INPUT = Cl.uint(101);
const ERR_INVALID_AMOUNT = Cl.uint(102);
const ERR_INSUFFICIENT_SUPPLY = Cl.uint(103);
const ERR_CANNOT_BUY_OWN_TOKEN = Cl.uint(104);

const PRICE_1_STX = 1_000_000; // micro-STX

function createToken(params: Partial<{
  name: string;
  symbol: string;
  description: string;
  category: string;
  totalSupply: number;
  price: number;
}> = {}, sender = creator) {
  const p = {
    name: "Lagos Property Token",
    symbol: "LPT",
    description: "Testnet token representing an interest in a fictional property project.",
    category: "Real Estate",
    totalSupply: 100_000,
    price: PRICE_1_STX,
    ...params,
  };
  return simnet.callPublicFn(
    "token-market",
    "create-token",
    [
      Cl.stringAscii(p.name),
      Cl.stringAscii(p.symbol),
      Cl.stringUtf8(p.description),
      Cl.stringAscii(p.category),
      Cl.uint(p.totalSupply),
      Cl.uint(p.price),
    ],
    sender,
  );
}

function purchase(tokenId: number, amount: number, sender = buyer) {
  return simnet.callPublicFn(
    "token-market",
    "purchase",
    [Cl.uint(tokenId), Cl.uint(amount)],
    sender,
  );
}

describe("token-market: create-token", () => {
  it("creates a token and assigns the caller as creator with full initial balance", () => {
    const { result } = createToken();
    expect(result).toBeOk(Cl.uint(0));

    const { result: token } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    expect(token).toBeSome(
      Cl.tuple({
        creator: Cl.principal(creator),
        name: Cl.stringAscii("Lagos Property Token"),
        symbol: Cl.stringAscii("LPT"),
        description: Cl.stringUtf8("Testnet token representing an interest in a fictional property project."),
        category: Cl.stringAscii("Real Estate"),
        "total-supply": Cl.uint(100_000),
        "available-supply": Cl.uint(100_000),
        price: Cl.uint(PRICE_1_STX),
        "created-at": Cl.uint(simnet.blockHeight),
      }),
    );

    const { result: balance } = simnet.callReadOnlyFn(
      "token-market",
      "get-balance",
      [Cl.uint(0), Cl.principal(creator)],
      creator,
    );
    expect(balance).toBeUint(100_000);
  });

  it("increments the token id for each new token, across different creators", () => {
    createToken({}, creator);
    createToken({ name: "Nairobi Agri Token", symbol: "NAT" }, otherCreator);
    const { result } = simnet.callReadOnlyFn("token-market", "get-token-count", [], creator);
    expect(result).toBeUint(2);
  });

  it("rejects an empty name", () => {
    const { result } = createToken({ name: "" });
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });

  it("rejects an empty symbol", () => {
    const { result } = createToken({ symbol: "" });
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });

  it("rejects an empty category", () => {
    const { result } = createToken({ category: "" });
    expect(result).toBeErr(ERR_INVALID_INPUT);
  });

  it("rejects a zero total supply", () => {
    const { result } = createToken({ totalSupply: 0 });
    expect(result).toBeErr(ERR_INVALID_AMOUNT);
  });

  it("rejects a zero price", () => {
    const { result } = createToken({ price: 0 });
    expect(result).toBeErr(ERR_INVALID_AMOUNT);
  });

  it("registers independent tokens for multiple creators", () => {
    createToken({ name: "Token A", symbol: "AAA" }, creator);
    createToken({ name: "Token B", symbol: "BBB" }, otherCreator);

    const { result: tokenA } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    const { result: tokenB } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(1)], creator);
    const fieldsA = (tokenA as any).value.value;
    const fieldsB = (tokenB as any).value.value;
    expect(fieldsA.creator).toStrictEqual(Cl.principal(creator));
    expect(fieldsB.creator).toStrictEqual(Cl.principal(otherCreator));
  });
});

describe("token-market: purchase", () => {
  it("executes a valid purchase: moves STX to the creator and tokens to the buyer", () => {
    createToken({ totalSupply: 1_000, price: PRICE_1_STX });

    const before = simnet.getAssetsMap().get("STX")!;
    const buyerStxBefore = before.get(buyer)!;
    const creatorStxBefore = before.get(creator)!;

    const { result } = purchase(0, 100, buyer);
    expect(result).toBeOk(Cl.bool(true));

    const after = simnet.getAssetsMap().get("STX")!;
    expect(after.get(buyer)!).toBe(buyerStxBefore - BigInt(100 * PRICE_1_STX));
    expect(after.get(creator)!).toBe(creatorStxBefore + BigInt(100 * PRICE_1_STX));

    const { result: buyerBalance } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    expect(buyerBalance).toBeUint(100);

    const { result: creatorBalance } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(0), Cl.principal(creator)], creator);
    expect(creatorBalance).toBeUint(900);

    const { result: token } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    const fields = (token as any).value.value;
    expect(fields["available-supply"]).toStrictEqual(Cl.uint(900));
  });

  it("rejects a purchase of a non-existent token", () => {
    const { result } = purchase(999, 10);
    expect(result).toBeErr(ERR_NOT_FOUND);
  });

  it("rejects a zero-amount purchase", () => {
    createToken();
    const { result } = purchase(0, 0);
    expect(result).toBeErr(ERR_INVALID_AMOUNT);
  });

  it("rejects a purchase exceeding available supply", () => {
    createToken({ totalSupply: 100 });
    const { result } = purchase(0, 101);
    expect(result).toBeErr(ERR_INSUFFICIENT_SUPPLY);
  });

  it("rejects a purchase when the buyer has insufficient STX", () => {
    createToken({ totalSupply: 1_000_000_000, price: PRICE_1_STX });
    // buyer's simnet balance is far below the STX cost of buying the entire supply
    const { result } = purchase(0, 1_000_000_000, buyer);
    expect(result.type).toBe("err");
  });

  it("rejects the creator buying their own token", () => {
    createToken();
    const { result } = purchase(0, 10, creator);
    expect(result).toBeErr(ERR_CANNOT_BUY_OWN_TOKEN);
  });

  it("allows purchasing the entire remaining supply", () => {
    createToken({ totalSupply: 50 });
    const { result } = purchase(0, 50, buyer);
    expect(result).toBeOk(Cl.bool(true));

    const { result: token } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    const fields = (token as any).value.value;
    expect(fields["available-supply"]).toStrictEqual(Cl.uint(0));
  });

  it("rejects any purchase after sellout", () => {
    createToken({ totalSupply: 50 });
    purchase(0, 50, buyer);
    const { result } = purchase(0, 1, otherBuyer);
    expect(result).toBeErr(ERR_INSUFFICIENT_SUPPLY);
  });

  it("supports multiple buyers purchasing from the same token", () => {
    createToken({ totalSupply: 1_000 });
    purchase(0, 300, buyer);
    purchase(0, 200, otherBuyer);

    const { result: buyerBalance } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    const { result: otherBuyerBalance } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(0), Cl.principal(otherBuyer)], otherBuyer);
    expect(buyerBalance).toBeUint(300);
    expect(otherBuyerBalance).toBeUint(200);

    const { result: token } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    const fields = (token as any).value.value;
    expect(fields["available-supply"]).toStrictEqual(Cl.uint(500));
  });

  it("keeps balances and supply independent across multiple tokens from multiple creators", () => {
    createToken({ name: "Token A", symbol: "AAA", totalSupply: 1_000 }, creator);
    createToken({ name: "Token B", symbol: "BBB", totalSupply: 500 }, otherCreator);

    purchase(0, 100, buyer);
    purchase(1, 50, buyer);

    const { result: balanceA } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    const { result: balanceB } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(1), Cl.principal(buyer)], buyer);
    expect(balanceA).toBeUint(100);
    expect(balanceB).toBeUint(50);

    const { result: tokenA } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    const { result: tokenB } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(1)], creator);
    expect((tokenA as any).value.value["available-supply"]).toStrictEqual(Cl.uint(900));
    expect((tokenB as any).value.value["available-supply"]).toStrictEqual(Cl.uint(450));
  });
});

describe("token-market: read-only accessors", () => {
  it("returns none for a non-existent token", () => {
    const { result } = simnet.callReadOnlyFn("token-market", "get-token", [Cl.uint(0)], creator);
    expect(result).toBeNone();
  });

  it("returns a zero balance for a wallet that never held the token", () => {
    createToken();
    const { result } = simnet.callReadOnlyFn("token-market", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    expect(result).toBeUint(0);
  });

  it("returns zero for the token count before any token is created", () => {
    const { result } = simnet.callReadOnlyFn("token-market", "get-token-count", [], creator);
    expect(result).toBeUint(0);
  });
});
