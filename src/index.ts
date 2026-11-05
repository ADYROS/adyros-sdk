/**
 * Adyros SDK.
 *
 * Inside an Adyros machine:
 *   const ady = Adyros.fromEnv();
 *   await ady.log("tool.call", "Fetched ETH/USD price");
 *   await ady.wallet.send({ to, data, note });
 *
 * From anywhere:
 *   const report = await Adyros.check("base:22");            // free website tier
 *   const paid = await Adyros.checkPaid("base:22", account); // x402, needs viem
 */
export { scanSkill, TEXT_FILE, type ScanResult, type Finding, type SkillFile } from "./scanner/scan.js";
export { verifyProof, type ProofVerification } from "./proof.js";
export { payX402 } from "./x402.js";

import { DEFAULT_SITE } from "./site.js";
export { DEFAULT_SITE };

export class AdyrosError extends Error {
  constructor(message: string, public status: number, public body?: unknown) {
    super(message);
  }
}

export type SendRequest = { to: string; value?: string | bigint; data?: string; note?: string };
export type SendResult = { transactionHash: string; usd: number; spentToday: number };
export type WalletInfo = {
  address: string | null;
  spentToday: number;
  balances: { usdc: number | null; eth: number | null };
  policy: { daily_limit_usd: number; per_tx_limit_usd: number; allowed_contracts: string[]; allowed_tokens: string[]; block_unlimited_approvals: boolean; frozen: boolean };
};

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(url, init);
  const text = await r.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    /* plain text */
  }
  if (!r.ok) throw new AdyrosError((body as { error?: string })?.error ?? `HTTP ${r.status}`, r.status, body);
  return body as T;
}

export class Adyros {
  private constructor(private apiUrl: string, private token: string) {}

  /** Reads ADYROS_API_URL and ADYROS_TOKEN, which every Adyros machine has. */
  static fromEnv(env: Record<string, string | undefined> = process.env) {
    const url = env.ADYROS_API_URL;
    const token = env.ADYROS_TOKEN;
    if (!url || !token) throw new Error("ADYROS_API_URL and ADYROS_TOKEN are not set. Are you running inside an Adyros machine?");
    return new Adyros(url.replace(/\/$/, ""), token);
  }

  static withToken(token: string, apiUrl = `${DEFAULT_SITE}/api/agent`) {
    return new Adyros(apiUrl.replace(/\/$/, ""), token);
  }

  private headers() {
    return { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" };
  }

  /** Append an event to this machine's Proof-of-Behavior chain. Logs are public: never include secrets. */
  log(kind: string, summary: string, data: Record<string, unknown> = {}) {
    return request<{ seq: number; hash: string }>(`${this.apiUrl}/log`, { method: "POST", headers: this.headers(), body: JSON.stringify({ kind, summary, data }) });
  }

  wallet = {
    get: () => request<WalletInfo>(`${this.apiUrl}/wallet`, { headers: this.headers() }),
    /** Checked against the owner's policy, simulated, then signed. Throws AdyrosError(403) with the reason when refused. */
    send: (req: SendRequest) =>
      request<SendResult>(`${this.apiUrl}/wallet/send`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...req, value: req.value === undefined ? undefined : req.value.toString() }),
      }),
  };

  /** Free Quick Check through the website (daily limit applies). */
  static check(agent: string, site = DEFAULT_SITE) {
    return request<Record<string, unknown>>(`${site}/api/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: agent }) });
  }

  /** Paid check over x402 (USDC on Base). `account` is a viem LocalAccount. */
  static async checkPaid(agent: string, account: Parameters<typeof payX402>[1], opts: { mode?: "quick" | "full"; site?: string; maxUsd?: number } = {}) {
    const site = opts.site ?? DEFAULT_SITE;
    const url = `${site}/api/v1/check?agent=${encodeURIComponent(agent)}&mode=${opts.mode ?? "quick"}`;
    const r = await payX402(url, account, { maxUsd: opts.maxUsd ?? 0.25 });
    const body = await r.json();
    if (!r.ok) throw new AdyrosError(body?.error ?? `HTTP ${r.status}`, r.status, body);
    return body as Record<string, unknown>;
  }
}

import { payX402 } from "./x402.js";
