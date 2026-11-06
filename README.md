# adyros

SDK and CLI for [Adyros](https://adyros.com), a guarded home for onchain agents.

[![ci](https://github.com/ADYROS/adyros-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/ADYROS/adyros-sdk/actions/workflows/ci.yml) ![license](https://img.shields.io/badge/license-MIT-black)

- **Guarded wallet**: agents spend through a policy wallet they never hold the key to.
- **Proof of Behavior**: append-only, hash-chained action log, anchored on Base.
- **Agent Check**: ERC-8004 identity, reputation and endpoint liveness, free or paid over x402.
- **Skill scanner**: catch key theft, hidden code, miners, wallet drains and prompt injection before you install a skill. Runs offline.

Requires Node.js 18.17 or newer.

## Install

```bash
npm install github:ADYROS/adyros-sdk     # now, straight from this repository
npm install adyros                       # once it is published on npm
```

Installing from GitHub builds the package on install. Every `npx adyros …` below also works as `npx github:ADYROS/adyros-sdk …` today.

## CLI

```bash
npx adyros scan ./my-skill          # exit 2 = blocked, 1 = review, 0 = clean
npx adyros check base:22            # Quick Check an ERC-8004 agent
npx adyros proof <machine-id>       # verify a public Proof-of-Behavior log
npx adyros demo                     # starter agent, inside an Adyros machine
```

Add `--json` for machine-readable output, and `--site <url>` (or `ADYROS_SITE_URL`) to point at another Adyros deployment. Use the scanner in CI to block risky skills before they reach an agent.

## Inside an Adyros machine

Every machine has `ADYROS_API_URL` and `ADYROS_TOKEN` set.

```ts
import { Adyros } from "adyros";

const ady = Adyros.fromEnv();

await ady.log("tool.call", "Fetched ETH/USD price", { source: "chainlink" });

const wallet = await ady.wallet.get(); // address, balances, policy, spent today
await ady.wallet.send({ to: "0x…", data: "0x…", note: "repay Aave" });
```

`wallet.send` is checked against the owner's policy (daily and per-transaction limits, allow-lists, unlimited-approval block, freeze switch) and simulated before it is signed. A refusal throws `AdyrosError` with status `403` and the rule that refused it.

## Paid checks over x402

```ts
import { Adyros } from "adyros";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.PAYER_KEY as `0x${string}`);
const report = await Adyros.checkPaid("base:22", account, { mode: "full", maxUsd: 0.25 });
```

Payment is a signed EIP-3009 `transferWithAuthorization` for USDC on Base (x402 `exact` scheme). `viem` is an optional peer dependency, needed only for paid checks.

## Library use

```ts
import { scanSkill } from "adyros/scanner";
import { verifyProof } from "adyros/proof";

const result = scanSkill([{ path: "SKILL.md", content }]);
const proof = await verifyProof("<machine-id>");
```

## Examples

[`examples/`](examples) has runnable scripts: block risky skills in CI, log from inside a machine, check an agent before paying it, and verify a public proof.

## Develop

```bash
npm install
npm test
```

## Security

Found a vulnerability? Please report it privately, see [SECURITY.md](SECURITY.md).

## License

MIT
