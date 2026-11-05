/**
 * Proof-of-Behavior hashing. Runs the same in the browser and on the server (Web Crypto),
 * so anyone can re-check a log without trusting Adyros.
 */
export const GENESIS = "0".repeat(64);
export const ANCHOR_PREFIX = "41445931"; // "ADY1"

export type LogEntry = { machine_id: string; seq: number; kind: string; summary: string; data: unknown; ts: string; prev_hash: string; hash: string };

export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function entryPreimage(e: Omit<LogEntry, "hash">) {
  return [e.prev_hash, e.machine_id, e.seq, e.kind, e.summary, canonical(e.data), e.ts].join("|");
}

export const hashEntry = (e: Omit<LogEntry, "hash">) => sha256Hex(entryPreimage(e));

/** Merkle root over entry hashes (hex). Odd levels duplicate the last node. */
export async function merkleRoot(hashes: string[]): Promise<string> {
  if (!hashes.length) return GENESIS;
  let level = hashes.map((h) => h.toLowerCase());
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(await sha256Hex(level[i] + (level[i + 1] ?? level[i])));
    level = next;
  }
  return level[0];
}

/** Verify a contiguous run of one machine's entries. Returns the first broken seq, or null if intact. */
export async function verifyChain(entries: LogEntry[]): Promise<{ ok: boolean; brokenAt: number | null }> {
  const sorted = [...entries].sort((a, b) => a.seq - b.seq);
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (i > 0 && e.prev_hash !== sorted[i - 1].hash) return { ok: false, brokenAt: e.seq };
    if ((await hashEntry(e)) !== e.hash) return { ok: false, brokenAt: e.seq };
  }
  return { ok: true, brokenAt: null };
}
