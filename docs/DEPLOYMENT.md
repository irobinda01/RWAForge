# Deployment

RWAForge's MVP has exactly one contract to deploy (`token-market.clar`) and
one stateless Next.js app to run. There is no database and no file storage
in this MVP, so the frontend is deployable anywhere that runs Next.js,
including serverless/edge hosts.

## 1. Deploy `token-market.clar` to Stacks Testnet

You need [Clarinet](https://docs.hiro.so/clarinet) 3.x and a Stacks
**Testnet** account funded with testnet STX (get some from the
[Hiro Stacks Testnet faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)
— this is test currency, not real money). The same faucet can send testnet
sBTC, which you'll want later to test sBTC purchases from a second wallet.

`token-market` calls the existing Testnet sBTC token
(`ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token`), which is already
on-chain, so there is nothing sBTC-related to deploy. `Clarinet.toml`
declares it as a `[[project.requirements]]` entry so `clarinet check` and
the simnet tests can resolve it; Clarinet downloads it into `.cache/` the
first time you run either (this needs network access).

**Contract names are unique per account and contracts are immutable**, so a
changed contract can't be redeployed under a name you've already used. This
repo registers the contract as `token-market-v2` in `Clarinet.toml` (the
source file is still `token-market.clar`); bump the suffix (or use a fresh
account) for the next incompatible change, and update
`NEXT_PUBLIC_MARKET_CONTRACT_ID` to match.

RWAForge never asks for or transmits your mnemonic/private key anywhere in
this repo or its tooling. `contracts/settings/Testnet.toml` is gitignored
specifically so you can put a real testnet-only mnemonic there locally
without risk of committing it.

```bash
cd contracts

# 1. Put your testnet-only mnemonic in settings/Testnet.toml
#    (replace the placeholder; this file is gitignored)

# 2. Generate a deployment plan against every contract in Clarinet.toml
clarinet deployments generate --testnet --medium-cost
```

This produces `deployments/default.testnet-plan.yaml` with one
`contract-publish` batch entry per contract declared in `Clarinet.toml` —
the MVP's `token-market`, plus the five legacy/dormant contracts kept in
this repo but unused by the MVP frontend (see
[SMART-CONTRACTS.md](./SMART-CONTRACTS.md)). **Edit the file down to just
`token-market-v2`**, and delete any `requirement-publish` entries for the sBTC contracts (the real one is already on Testnet) so you don't spend testnet STX deploying contracts nothing
in the app calls. The trimmed file should look like this (your
`expected-sender` and `cost` will differ):

```yaml
---
id: 0
name: Testnet deployment
network: testnet
stacks-node: "https://api.testnet.hiro.so"
bitcoin-node: "http://blockstack:blockstacksystem@bitcoind.testnet.stacks.co:18332"
plan:
  batches:
    - id: 0
      transactions:
        - contract-publish:
            contract-name: token-market
            expected-sender: ST...YOUR-ADDRESS
            cost: 45340
            path: "contracts\\token-market.clar"
            anchor-block-only: true
            clarity-version: 3
      epoch: "3.2"
```

Then broadcast it:

```bash
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

Clarinet shows a confirmation dashboard and waits for the transaction to
confirm on Testnet. Once it does, your contract id is
`<expected-sender>.token-market` — note it down.

## 2. Configure the frontend

```bash
cd apps/web
cp .env.example .env.local
```

Set:

```
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_MARKET_CONTRACT_ID=<expected-sender>.token-market
```

```bash
npm run dev
```

Open http://localhost:3000, connect a Testnet-configured Leather or Xverse
wallet, and create a token — it should appear at `/tokens` and
`/tokens/<id>` immediately after the create transaction confirms.

## 3. Verify end-to-end

1. Wallet A creates a token at `/create`. Confirm the transaction on the
   [Stacks Testnet explorer](https://explorer.hiro.so) via the link shown
   on the success screen.
2. The token appears at `/tokens` and its own `/tokens/<id>` page, with
   fields read live from the contract (not cached anywhere).
3. Wallet B connects, opens the same token, picks a payment asset (STX,
   or sBTC if the creator priced the token in it — fund Wallet B with
   testnet sBTC from the faucet first), enters a quantity, and purchases
   it. Confirm the purchase transaction on the explorer.
4. `/tokens/<id>` now shows decreased available supply, and Wallet B's
   balance (visible on the token page when connected) reflects the
   purchase. All of this is read directly from `get-token` / `get-balance`
   on `token-market.clar` — refresh the page or hit **Refresh** and the
   numbers come from the chain, not from local state.

## Deploying the frontend

`apps/web` is a standard, stateless Next.js 16 app — no database, no local
file storage, so any Next.js-compatible host works (Vercel, a container, a
plain Node server):

```bash
cd apps/web
npm run build
npm run start
```

Required environment variables: see `.env.example`. All three are
`NEXT_PUBLIC_*` and inlined at build time, so changing one requires a
rebuild/redeploy.

## Mainnet

Two things are testnet-specific beyond the network selector
(`NEXT_PUBLIC_STACKS_NETWORK=mainnet`) and using
`clarinet deployments generate --mainnet` with a funded mainnet account:

1. **The sBTC contract literal.** Clarity resolves `contract-call?` targets
   statically, so `purchase-with-sbtc` in `token-market.clar` names the
   Testnet sBTC token directly. Before a mainnet deploy, replace
   `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-token` with
   `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token` in that file
   (a testnet address won't even deploy on mainnet).
2. **The frontend's sBTC contract id**, `getSbtcContractId` in
   `packages/stacks/src/config.ts`, already switches on
   `NEXT_PUBLIC_STACKS_NETWORK`, so it needs no change — but it must
   agree with the literal above.

This MVP has not been deployed to or audited for mainnet — see
[ROADMAP.md](./ROADMAP.md).
