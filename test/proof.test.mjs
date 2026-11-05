import { test } from "node:test";
import assert from "node:assert/strict";
import { hashEntry, merkleRoot, verifyChain, canonical } from "../dist/proof.js";

const GENESIS = "0".repeat(64);

async function chain(n) {
  const out = [];
  let prev = GENESIS;
  for (let i = 1; i <= n; i++) {
    const e = { machine_id: "m1", seq: i, kind: "agent.tool.call", summary: `step ${i}`, data: { b: i, a: "x" }, ts: `2026-11-05T00:00:0${i}.000Z`, prev_hash: prev };
    const hash = await hashEntry(e);
    out.push({ ...e, hash });
    prev = hash;
  }
  return out;
}

test("canonical JSON is key-order independent", () => {
  assert.equal(canonical({ b: 1, a: [2, { d: 1, c: 2 }] }), canonical({ a: [2, { c: 2, d: 1 }], b: 1 }));
});

test("an intact chain verifies", async () => {
  const v = await verifyChain(await chain(5));
  assert.deepEqual(v, { ok: true, brokenAt: null });
});

test("editing one event breaks the chain at that event", async () => {
  const c = await chain(5);
  c[2] = { ...c[2], summary: "tampered" };
  const v = await verifyChain(c);
  assert.equal(v.ok, false);
  assert.equal(v.brokenAt, 3);
});

test("merkle root changes when any leaf changes", async () => {
  const c = await chain(7);
  const a = await merkleRoot(c.map((e) => e.hash));
  const b = await merkleRoot([...c.slice(0, 6).map((e) => e.hash), GENESIS]);
  assert.notEqual(a, b);
  assert.equal(a.length, 64);
});
