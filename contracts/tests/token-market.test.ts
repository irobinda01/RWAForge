import { beforeEach, describe, expect, it } from "vitest";
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
const ERR_PAYMENT_NOT_ACCEPTED = Cl.uint(105);

const PRICE_1_STX = 1_000_000; // micro-STX
const PRICE_1000_SATS = 1_000; // sats (1e-8 sBTC)
const SBTC = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token";

// Simnet wallets start with no sBTC. The sBTC registry only lets its
// `sbtc-deposit` contract mint, so each test deploys a throwaway stand-in
// under that name and uses it to fund the buyers with 10 sBTC (1e9 sats).
const SBTC_FUNDING = 1_000_000_000;

beforeEach(() => {
  simnet.deployContract(
    "sbtc-deposit",
    `(define-public (mint (amount uint) (to principal))
       (contract-call? '${SBTC} protocol-mint amount to 0x01))`,
    null,
    simnet.deployer,
  );
  for (const wallet of [buyer, otherBuyer]) {
    simnet.callPublicFn(
      `${simnet.deployer}.sbtc-deposit`,
      "mint",
      [Cl.uint(SBTC_FUNDING), Cl.principal(wallet)],
      simnet.deployer,
    );
  }
});

function sbtcBalance(who: string): bigint {
  const { result } = simnet.callReadOnlyFn(SBTC, "get-balance", [Cl.principal(who)], who);
  return (result as any).value.value as bigint;
}

function createToken(params: Partial<{
  name: string;
  symbol: string;
  description: string;
  category: string;
  totalSupply: number;
  priceStx: number;
  priceSbtc: number;
}> = {}, sender = creator) {
  const p = {
    name: "Lagos Property Token",
    symbol: "LPT",
    description: "Testnet token representing an interest in a fictional property project.",
    category: "Real Estate",
    totalSupply: 100_000,
    priceStx: PRICE_1_STX,
    priceSbtc: 0,
    ...params,
  };
  return simnet.callPublicFn(
    "token-market-v2",
    "create-token",
    [
      Cl.stringAscii(p.name),
      Cl.stringAscii(p.symbol),
      Cl.stringUtf8(p.description),
      Cl.stringAscii(p.category),
      Cl.uint(p.totalSupply),
      Cl.uint(p.priceStx),
      Cl.uint(p.priceSbtc),
    ],
    sender,
  );
}

function purchase(tokenId: number, amount: number, sender = buyer) {
  return simnet.callPublicFn(
    "token-market-v2",
    "purchase",
    [Cl.uint(tokenId), Cl.uint(amount)],
    sender,
  );
}

function purchaseWithSbtc(tokenId: number, amount: number, sender = buyer) {
  return simnet.callPublicFn(
    "token-market-v2",
    "purchase-with-sbtc",
    [Cl.uint(tokenId), Cl.uint(amount)],
    sender,
  );
}

describe("token-market: create-token", () => {
  it("creates a token and assigns the caller as creator with full initial balance", () => {
    const { result } = createToken();
    expect(result).toBeOk(Cl.uint(0));

    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    expect(token).toBeSome(
      Cl.tuple({
        creator: Cl.principal(creator),
        name: Cl.stringAscii("Lagos Property Token"),
        symbol: Cl.stringAscii("LPT"),
        description: Cl.stringUtf8("Testnet token representing an interest in a fictional property project."),
        category: Cl.stringAscii("Real Estate"),
        "total-supply": Cl.uint(100_000),
        "available-supply": Cl.uint(100_000),
        "price-stx": Cl.uint(PRICE_1_STX),
        "price-sbtc": Cl.uint(0),
        "created-at": Cl.uint(simnet.blockHeight),
      }),
    );

    const { result: balance } = simnet.callReadOnlyFn(
      "token-market-v2",
      "get-balance",
      [Cl.uint(0), Cl.principal(creator)],
      creator,
    );
    expect(balance).toBeUint(100_000);
  });

  it("increments the token id for each new token, across different creators", () => {
    createToken({}, creator);
    createToken({ name: "Nairobi Agri Token", symbol: "NAT" }, otherCreator);
    const { result } = simnet.callReadOnlyFn("token-market-v2", "get-token-count", [], creator);
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

  it("rejects a token priced in neither STX nor sBTC", () => {
    const { result } = createToken({ priceStx: 0, priceSbtc: 0 });
    expect(result).toBeErr(ERR_INVALID_AMOUNT);
  });

  it("accepts a token priced in sBTC only", () => {
    const { result } = createToken({ priceStx: 0, priceSbtc: PRICE_1000_SATS });
    expect(result).toBeOk(Cl.uint(0));
  });

  it("accepts a token priced in both STX and sBTC", () => {
    const { result } = createToken({ priceStx: PRICE_1_STX, priceSbtc: PRICE_1000_SATS });
    expect(result).toBeOk(Cl.uint(0));
    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    const fields = (token as any).value.value;
    expect(fields["price-stx"]).toStrictEqual(Cl.uint(PRICE_1_STX));
    expect(fields["price-sbtc"]).toStrictEqual(Cl.uint(PRICE_1000_SATS));
  });

  it("registers independent tokens for multiple creators", () => {
    createToken({ name: "Token A", symbol: "AAA" }, creator);
    createToken({ name: "Token B", symbol: "BBB" }, otherCreator);

    const { result: tokenA } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    const { result: tokenB } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(1)], creator);
    const fieldsA = (tokenA as any).value.value;
    const fieldsB = (tokenB as any).value.value;
    expect(fieldsA.creator).toStrictEqual(Cl.principal(creator));
    expect(fieldsB.creator).toStrictEqual(Cl.principal(otherCreator));
  });
});

describe("token-market: purchase", () => {
  it("executes a valid purchase: moves STX to the creator and tokens to the buyer", () => {
    createToken({ totalSupply: 1_000, priceStx: PRICE_1_STX });

    const before = simnet.getAssetsMap().get("STX")!;
    const buyerStxBefore = before.get(buyer)!;
    const creatorStxBefore = before.get(creator)!;

    const { result } = purchase(0, 100, buyer);
    expect(result).toBeOk(Cl.bool(true));

    const after = simnet.getAssetsMap().get("STX")!;
    expect(after.get(buyer)!).toBe(buyerStxBefore - BigInt(100 * PRICE_1_STX));
    expect(after.get(creator)!).toBe(creatorStxBefore + BigInt(100 * PRICE_1_STX));

    const { result: buyerBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    expect(buyerBalance).toBeUint(100);

    const { result: creatorBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(creator)], creator);
    expect(creatorBalance).toBeUint(900);

    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
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
    createToken({ totalSupply: 1_000_000_000, priceStx: PRICE_1_STX });
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

    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
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

    const { result: buyerBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    const { result: otherBuyerBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(otherBuyer)], otherBuyer);
    expect(buyerBalance).toBeUint(300);
    expect(otherBuyerBalance).toBeUint(200);

    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    const fields = (token as any).value.value;
    expect(fields["available-supply"]).toStrictEqual(Cl.uint(500));
  });

  it("keeps balances and supply independent across multiple tokens from multiple creators", () => {
    createToken({ name: "Token A", symbol: "AAA", totalSupply: 1_000 }, creator);
    createToken({ name: "Token B", symbol: "BBB", totalSupply: 500 }, otherCreator);

    purchase(0, 100, buyer);
    purchase(1, 50, buyer);

    const { result: balanceA } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    const { result: balanceB } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(1), Cl.principal(buyer)], buyer);
    expect(balanceA).toBeUint(100);
    expect(balanceB).toBeUint(50);

    const { result: tokenA } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    const { result: tokenB } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(1)], creator);
    expect((tokenA as any).value.value["available-supply"]).toStrictEqual(Cl.uint(900));
    expect((tokenB as any).value.value["available-supply"]).toStrictEqual(Cl.uint(450));
  });
});

describe("token-market: purchase-with-sbtc", () => {
  it("moves sBTC to the creator and tokens to the buyer, leaving STX untouched", () => {
    createToken({ totalSupply: 1_000, priceStx: 0, priceSbtc: PRICE_1000_SATS });

    const stxBefore = simnet.getAssetsMap().get("STX")!;
    const buyerStx = stxBefore.get(buyer)!;
    const buyerSbtc = sbtcBalance(buyer);
    const creatorSbtc = sbtcBalance(creator);

    const { result } = purchaseWithSbtc(0, 100, buyer);
    expect(result).toBeOk(Cl.bool(true));

    const cost = BigInt(100 * PRICE_1000_SATS);
    expect(sbtcBalance(buyer)).toBe(buyerSbtc - cost);
    expect(sbtcBalance(creator)).toBe(creatorSbtc + cost);
    expect(simnet.getAssetsMap().get("STX")!.get(buyer)!).toBe(buyerStx);

    const { result: buyerBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    const { result: creatorBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(creator)], creator);
    expect(buyerBalance).toBeUint(100);
    expect(creatorBalance).toBeUint(900);

    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    expect((token as any).value.value["available-supply"]).toStrictEqual(Cl.uint(900));
  });

  it("lets a token accept both assets, with each purchase paid in its own asset", () => {
    createToken({ totalSupply: 1_000, priceStx: PRICE_1_STX, priceSbtc: PRICE_1000_SATS });
    expect(purchase(0, 100, buyer).result).toBeOk(Cl.bool(true));
    expect(purchaseWithSbtc(0, 50, otherBuyer).result).toBeOk(Cl.bool(true));

    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    expect((token as any).value.value["available-supply"]).toStrictEqual(Cl.uint(850));
  });

  it("rejects an sBTC purchase of a token that only accepts STX", () => {
    createToken({ priceStx: PRICE_1_STX, priceSbtc: 0 });
    expect(purchaseWithSbtc(0, 10).result).toBeErr(ERR_PAYMENT_NOT_ACCEPTED);
  });

  it("rejects an STX purchase of a token that only accepts sBTC", () => {
    createToken({ priceStx: 0, priceSbtc: PRICE_1000_SATS });
    expect(purchase(0, 10).result).toBeErr(ERR_PAYMENT_NOT_ACCEPTED);
  });

  it("rejects a purchase of a non-existent token", () => {
    expect(purchaseWithSbtc(999, 10).result).toBeErr(ERR_NOT_FOUND);
  });

  it("rejects a zero-amount purchase", () => {
    createToken({ priceStx: 0, priceSbtc: PRICE_1000_SATS });
    expect(purchaseWithSbtc(0, 0).result).toBeErr(ERR_INVALID_AMOUNT);
  });

  it("rejects a purchase exceeding available supply", () => {
    createToken({ totalSupply: 100, priceStx: 0, priceSbtc: PRICE_1000_SATS });
    expect(purchaseWithSbtc(0, 101).result).toBeErr(ERR_INSUFFICIENT_SUPPLY);
  });

  it("rejects the creator buying their own token", () => {
    createToken({ priceStx: 0, priceSbtc: PRICE_1000_SATS });
    expect(purchaseWithSbtc(0, 10, creator).result).toBeErr(ERR_CANNOT_BUY_OWN_TOKEN);
  });

  it("changes no state when the buyer has insufficient sBTC", () => {
    // Each buyer holds 1_000_000_000 sats; this purchase costs 2_000_000_000.
    createToken({ totalSupply: 2_000_000, priceStx: 0, priceSbtc: PRICE_1000_SATS });
    const buyerSbtc = sbtcBalance(buyer);
    const creatorSbtc = sbtcBalance(creator);

    const { result } = purchaseWithSbtc(0, 2_000_000, buyer);
    expect(result.type).toBe("err");

    expect(sbtcBalance(buyer)).toBe(buyerSbtc);
    expect(sbtcBalance(creator)).toBe(creatorSbtc);
    const { result: buyerBalance } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    expect(buyerBalance).toBeUint(0);
    const { result: token } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    expect((token as any).value.value["available-supply"]).toStrictEqual(Cl.uint(2_000_000));
  });
});

describe("token-market: read-only accessors", () => {
  it("returns none for a non-existent token", () => {
    const { result } = simnet.callReadOnlyFn("token-market-v2", "get-token", [Cl.uint(0)], creator);
    expect(result).toBeNone();
  });

  it("returns a zero balance for a wallet that never held the token", () => {
    createToken();
    const { result } = simnet.callReadOnlyFn("token-market-v2", "get-balance", [Cl.uint(0), Cl.principal(buyer)], buyer);
    expect(result).toBeUint(0);
  });

  it("returns zero for the token count before any token is created", () => {
    const { result } = simnet.callReadOnlyFn("token-market-v2", "get-token-count", [], creator);
    expect(result).toBeUint(0);
  });
});
