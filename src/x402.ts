/**
 * Minimal x402 client for the "exact" scheme with USDC on Base (x402 v1).
 * `account` is any viem LocalAccount (privateKeyToAccount, etc.).
 */
type Account = {
  address: `0x${string}`;
  signTypedData: (args: {
    domain: Record<string, unknown>;
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<`0x${string}`>;
};

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

export async function payX402(url: string, account: Account, opts: { maxUsd: number; init?: RequestInit }) {
  const first = await fetch(url, opts.init);
  if (first.status !== 402) return first;
  const body = (await first.json()) as { accepts?: { scheme: string; network: string; asset: string; maxAmountRequired: string; payTo: `0x${string}`; extra?: { name?: string; version?: string } }[] };
  const req = (body.accepts ?? []).find((a) => a.scheme === "exact" && a.network === "base" && a.asset.toLowerCase() === USDC_BASE);
  if (!req) throw new Error("No supported payment option (exact, USDC on Base).");
  const value = BigInt(req.maxAmountRequired);
  if (Number(value) / 1e6 > opts.maxUsd) throw new Error(`Price ${Number(value) / 1e6} USDC is above maxUsd ${opts.maxUsd}.`);

  const now = Math.floor(Date.now() / 1000);
  const nonce = `0x${[...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("")}` as const;
  const authorization = { from: account.address, to: req.payTo, value, validAfter: BigInt(now - 30), validBefore: BigInt(now + 120), nonce };
  const signature = await account.signTypedData({
    domain: { name: req.extra?.name ?? "USD Coin", version: req.extra?.version ?? "2", chainId: 8453, verifyingContract: USDC_BASE },
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
    message: authorization,
  });
  const payload = {
    x402Version: 1,
    scheme: "exact",
    network: "base",
    payload: {
      signature,
      authorization: { ...authorization, value: value.toString(), validAfter: authorization.validAfter.toString(), validBefore: authorization.validBefore.toString() },
    },
  };
  const header = btoa(JSON.stringify(payload));
  return fetch(url, { ...opts.init, headers: { ...(opts.init?.headers ?? {}), "X-PAYMENT": header } });
}
