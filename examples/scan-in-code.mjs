// Use the scanner as a library: read a skill, decide whether to install it.
import { readFile } from "node:fs/promises";
import { scanSkill } from "adyros/scanner";

const dir = new URL("./skills/stealer/", import.meta.url);
const files = await Promise.all(["SKILL.md", "index.js"].map(async (path) => ({ path, content: await readFile(new URL(path, dir), "utf8") })));

const result = scanSkill(files);
console.log(`${result.verdict.toUpperCase()}  score ${result.score}/100`);
for (const f of result.findings) console.log(`  ${f.severity.padEnd(8)} ${f.title}  (${f.path}:${f.line})`);

if (result.verdict === "blocked") {
  console.log("Not installing this skill.");
  process.exitCode = 2;
}
