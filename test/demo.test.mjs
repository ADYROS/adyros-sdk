import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDemo } from "../dist/index.js";

// A stand-in for the Adyros agent API: records what the starter agent does.
function fakeAdyros() {
  const logs = [];
  const sends = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const json = (code, data) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };
    if (req.headers.authorization !== "Bearer test-token" && req.url.startsWith("/api/agent")) return json(401, { error: "bad token" });
    if (req.url === "/api/agent/log") { logs.push(JSON.parse(body)); return json(200, { seq: logs.length, hash: "h" }); }
    if (req.url === "/api/agent/wallet") return json(200, { address: "0xabc", spentToday: 0, balances: { usdc: 0, eth: 0 }, policy: { daily_limit_usd: 100, per_tx_limit_usd: 25, allowed_contracts: [], allowed_tokens: [], block_unlimited_approvals: true, frozen: false } });
    if (req.url === "/api/agent/wallet/send") { sends.push(JSON.parse(body)); return json(403, { error: "Unlimited token approvals are blocked by this machine's policy." }); }
    if (req.url === "/api/check") return json(200, { score: 73, grade: "mixed" });
    json(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(0, () => resolve({ server, logs, sends, url: `http://127.0.0.1:${server.address().port}` })));
}

test("starter agent exercises every wall once and spends nothing", async () => {
  const api = await fakeAdyros();
  process.env.ADYROS_API_URL = `${api.url}/api/agent`;
  process.env.ADYROS_TOKEN = "test-token";
  process.env.ADYROS_DATA_DIR = await mkdtemp(join(tmpdir(), "adyros-demo-"));
  try {
    await runDemo({ once: true });
    const kinds = api.logs.map((l) => l.kind);
    assert.deepEqual(kinds, ["agent.start", "wallet.read", "skill.scan", "skill.scan", "agent.check"]);
    assert.equal(api.logs.find((l) => l.summary.includes("stealer")).data.verdict, "blocked");
    assert.equal(api.logs.find((l) => l.summary.includes("clean")).data.verdict, "clean");
    assert.equal(api.logs.at(-1).data.decision, "hold");
    // The only wallet action is an unlimited approval, which the guard refuses.
    assert.equal(api.sends.length, 1);
    assert.match(api.sends[0].data, /^0x095ea7b3.{64}f{64}$/);
  } finally {
    api.server.close();
  }
});
