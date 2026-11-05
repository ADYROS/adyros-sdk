import { ANCHOR_PREFIX, merkleRoot, verifyChain, type LogEntry } from "./proof-hash.js";
import { DEFAULT_SITE } from "./site.js";

export { hashEntry, merkleRoot, verifyChain, canonical, type LogEntry } from "./proof-hash.js";

export type ProofVerification = {
  machine: string;
  entries: number;
  chain: { ok: boolean; brokenAt: number | null };
  anchors: { id: number; entries: number; rootMatches: boolean; onchainMatches: boolean | null; tx: string | null }[];
};

/** Re-verify a machine's public Proof-of-Behavior log without trusting Adyros. */
export async function verifyProof(machineId: string, opts: { site?: string; rpc?: string } = {}): Promise<ProofVerification> {
  const site = opts.site ?? DEFAULT_SITE;
  const rpc = opts.rpc ?? "https://mainnet.base.org";
  const r = await fetch(`${site}/api/proof/${machineId}`);
  const d = (await r.json()) as { error?: string; machine: { name: string }; entries: LogEntry[]; anchors: { id: number; root: string; entries: number; tx_hash: string | null }[] };
  if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
  const chain = await verifyChain(d.entries);
  const anchors: ProofVerification["anchors"] = [];
  for (const a of d.anchors) {
    const hr = await fetch(`${site}/api/proof/${machineId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anchorId: a.id }) });
    const { hashes } = (await hr.json()) as { hashes?: string[] };
    const rootMatches = !!hashes && (await merkleRoot(hashes)) === a.root;
    let onchainMatches: boolean | null = null;
    if (a.tx_hash) {
      const tr = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [a.tx_hash] }) });
      const tx = ((await tr.json()) as { result?: { input?: string } }).result;
      onchainMatches = tx ? String(tx.input).toLowerCase() === `0x${ANCHOR_PREFIX}${a.root}` : null;
    }
    anchors.push({ id: a.id, entries: a.entries, rootMatches, onchainMatches, tx: a.tx_hash });
  }
  return { machine: d.machine.name, entries: d.entries.length, chain, anchors };
}
