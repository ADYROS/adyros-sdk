#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { scanSkill, TEXT_FILE, type SkillFile } from "./scanner/scan.js";
import { verifyProof } from "./proof.js";
import { Adyros, DEFAULT_SITE } from "./index.js";

const SKIP = /(^|[\\/])(node_modules|\.git|dist|build|\.next|vendor|__pycache__)([\\/]|$)/;
const c = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function collect(root: string): Promise<SkillFile[]> {
  const info = await stat(root);
  if (info.isFile()) return [{ path: root, content: await readFile(root, "utf8") }];
  const out: SkillFile[] = [];
  async function walk(dir: string) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (SKIP.test(p)) continue;
      if (e.isDirectory()) await walk(p);
      else if (TEXT_FILE.test(e.name) || TEXT_FILE.test(p)) {
        const s = await stat(p);
        if (s.size <= 400_000) out.push({ path: relative(root, p).replace(/\\/g, "/"), content: await readFile(p, "utf8") });
      }
      if (out.length >= 2000) return;
    }
  }
  await walk(root);
  return out;
}

async function scan(target: string, json: boolean) {
  const files = await collect(target);
  const r = scanSkill(files);
  if (json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    const verdict = r.verdict === "blocked" ? c.red("BLOCKED") : r.verdict === "review" ? c.yellow("REVIEW") : c.green("CLEAN");
    console.log(`${verdict}  score ${r.score}/100  ${c.dim(`${r.stats.files} files, ${r.stats.lines} lines`)}`);
    for (const f of r.findings) {
      const sev = f.severity === "critical" ? c.red(f.severity) : f.severity === "high" ? c.yellow(f.severity) : c.dim(f.severity);
      console.log(`  ${sev.padEnd(18)} ${f.title}  ${c.dim(`${f.path}:${f.line}`)}`);
    }
    if (r.hosts.length) console.log(c.dim(`  hosts: ${r.hosts.map((h) => h.host).join(", ")}`));
  }
  process.exitCode = r.verdict === "blocked" ? 2 : r.verdict === "review" ? 1 : 0;
}

async function check(agent: string, site: string, json: boolean) {
  const r = (await Adyros.check(agent, site)) as { score: number; grade: string; registration?: { name?: string }; flags: { level: string; text: string }[]; factors: { label: string; points: number; max: number; checked: boolean }[] };
  if (json) return console.log(JSON.stringify(r, null, 2));
  console.log(`${c.bold(r.registration?.name ?? agent)}  score ${r.score} (${r.grade})`);
  for (const f of r.factors) console.log(`  ${f.label.padEnd(26)} ${f.checked ? `${f.points}/${f.max}` : c.dim("not checked")}`);
  for (const f of r.flags) console.log(`  ${f.level === "good" ? c.green("+") : f.level === "warn" ? c.yellow("!") : c.red("×")} ${f.text}`);
}

async function proof(id: string, site: string, json: boolean) {
  const v = await verifyProof(id, { site });
  if (json) return console.log(JSON.stringify(v, null, 2));
  console.log(`${c.bold(v.machine)}  ${v.entries} events  chain ${v.chain.ok ? c.green("intact") : c.red(`broken at #${v.chain.brokenAt}`)}`);
  for (const a of v.anchors) {
    console.log(`  anchor #${a.id}  root ${a.rootMatches ? c.green("ok") : c.red("mismatch")}  onchain ${a.onchainMatches === null ? c.dim("n/a") : a.onchainMatches ? c.green("ok") : c.red("mismatch")}  ${c.dim(a.tx ?? "")}`);
  }
  if (!v.chain.ok || v.anchors.some((a) => !a.rootMatches || a.onchainMatches === false)) process.exitCode = 1;
}

const HELP = `adyros — Adyros CLI

  adyros scan <path>            Scan a skill or plugin folder (offline). Exit 2 = blocked, 1 = review.
  adyros check <chain:id>       Quick Check an ERC-8004 agent, e.g. base:22
  adyros proof <machine-id>     Verify a public Proof-of-Behavior log and its anchors

Options: --json   --site <url> (default ${DEFAULT_SITE})`;

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const si = args.indexOf("--site");
  const site = si >= 0 ? args[si + 1] : DEFAULT_SITE;
  const pos = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--site");
  const [cmd, arg] = pos;
  try {
    if (cmd === "scan" && arg) await scan(arg, json);
    else if (cmd === "check" && arg) await check(arg, site, json);
    else if (cmd === "proof" && arg) await proof(arg, site, json);
    else {
      console.log(HELP);
      if (cmd && cmd !== "help" && cmd !== "--help") process.exitCode = 64;
    }
  } catch (e) {
    console.error(c.red(e instanceof Error ? e.message : String(e)));
    process.exitCode = 70;
  }
}

main();
