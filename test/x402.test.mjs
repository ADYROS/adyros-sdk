import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { verifyTypedData, getAddress } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { payX402 } from "../dist/x402.js";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PAY_TO = "0x000000000000000000000000000000000000dEaD";

test("payX402 signs an EIP-3009 authorization the server can verify", async () => {
  let captured = null;
  const server = createServer((req, res) => {
    const h = req.headers["x-payment"];
    if (!h) {
      res.writeHead(402, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ x402Version: 1, accepts: [{ scheme: "exact", network: "base", asset: USDC, maxAmountRequired: "15000", payTo: PAY_TO, extra: { name: "USD Coin", version: "2" } }] }));
      return;
    }
    captured = JSON.parse(Buffer.from(String(h), "base64").toString("utf8"));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("{}");
  });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const account = privateKeyToAccount(generatePrivateKey());

  const r = await payX402(url, account, { maxUsd: 0.05 });
  server.close();
  assert.equal(r.status, 200);
  assert.equal(captured.x402Version, 1);
  assert.equal(captured.scheme, "exact");
  const a = captured.payload.authorization;
  assert.equal(getAddress(a.to), getAddress(PAY_TO));
  assert.equal(a.value, "15000");

  // Same domain and types the Adyros server uses in settle().
  const ok = await verifyTypedData({
    address: account.address,
    domain: { name: "USD Coin", version: "2", chainId: 8453, verifyingContract: USDC },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: { from: getAddress(a.from), to: getAddress(a.to), value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore), nonce: a.nonce },
    signature: captured.payload.signature,
  });
  assert.equal(ok, true);
});

test("payX402 refuses prices above maxUsd", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(402, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ x402Version: 1, accepts: [{ scheme: "exact", network: "base", asset: USDC, maxAmountRequired: "5000000", payTo: PAY_TO }] }));
  });
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  await assert.rejects(payX402(url, privateKeyToAccount(generatePrivateKey()), { maxUsd: 0.05 }), /above maxUsd/);
  server.close();
});
