import { RULES, SEVERITY_WEIGHT, type Rule, type Severity } from "./rules.js";

export type SkillFile = { path: string; content: string };

export type Finding = {
  ruleId: string;
  title: string;
  severity: Severity;
  category: Rule["category"];
  why: string;
  path: string;
  line: number;
  snippet: string;
};

export type ScanResult = {
  verdict: "blocked" | "review" | "clean";
  score: number;
  findings: Finding[];
  hosts: { host: string; count: number }[];
  files: { path: string; lines: number; findings: number }[];
  stats: { files: number; lines: number; bytes: number };
};

const MAX_PER_RULE = 5;
const NETWORK_SEND = /(fetch\s*\(|axios(\.\w+)?\s*\(|requests\.(post|put|get)\(|http(s)?\.request\(|XMLHttpRequest|new\s+WebSocket\(|urllib\.request|curl\s+(-\w+\s+)*https?:|wget\s+https?:|navigator\.sendBeacon)/;
const URL_RE = /\bhttps?:\/\/([a-z0-9.-]+\.[a-z]{2,}|(\d{1,3}\.){3}\d{1,3})(:\d+)?/gi;
const IGNORE_HOSTS = /(^|\.)(github\.com|githubusercontent\.com|npmjs\.(com|org)|nodejs\.org|python\.org|pypi\.org|w3\.org|schema\.org|example\.(com|org)|localhost|eips\.ethereum\.org|mozilla\.org)$/i;

export function scanSkill(files: SkillFile[]): ScanResult {
  const findings: Finding[] = [];
  const hostCount = new Map<string, number>();
  const perFile: ScanResult["files"] = [];
  let lines = 0;
  let bytes = 0;

  for (const f of files) {
    const text = f.content.replace(/\r\n?/g, "\n");
    const fileLines = text.split("\n");
    lines += fileLines.length;
    bytes += f.content.length;
    const counts = new Map<string, number>();
    let fileFindings = 0;
    let hasSecret = false;
    let firstSendLine = -1;

    fileLines.forEach((raw, idx) => {
      const ln = raw.length > 2000 ? raw.slice(0, 2000) : raw;
      for (const r of RULES) {
        if (r.files && !r.files.test(f.path)) continue;
        if (!r.pattern.test(ln)) continue;
        const c = counts.get(r.id) ?? 0;
        counts.set(r.id, c + 1);
        if (r.category === "secrets") hasSecret = true;
        if (c >= MAX_PER_RULE) continue;
        findings.push({ ruleId: r.id, title: r.title, severity: r.severity, category: r.category, why: r.why, path: f.path, line: idx + 1, snippet: ln.trim().slice(0, 220) });
        fileFindings++;
      }
      if (firstSendLine < 0 && NETWORK_SEND.test(ln)) firstSendLine = idx + 1;
      for (const m of ln.matchAll(URL_RE)) {
        const host = m[1].toLowerCase();
        if (IGNORE_HOSTS.test(host)) continue;
        hostCount.set(host, (hostCount.get(host) ?? 0) + 1);
      }
    });

    // Secrets and an outbound request in the same file: the shape of a key stealer.
    if (hasSecret && firstSendLine > 0) {
      findings.push({
        ruleId: "secret-plus-network",
        title: "Reads secrets and sends data out",
        severity: "critical",
        category: "exfiltration",
        why: "This file both touches key material and makes an outbound request. Together, that is how keys get stolen.",
        path: f.path,
        line: firstSendLine,
        snippet: (fileLines[firstSendLine - 1] ?? "").trim().slice(0, 220),
      });
      fileFindings++;
    }
    perFile.push({ path: f.path, lines: fileLines.length, findings: fileFindings });
  }

  // Score: each rule counts once per severity weight, extra hits add a little.
  const byRule = new Map<string, { sev: Severity; n: number }>();
  for (const x of findings) {
    const k = x.ruleId;
    const prev = byRule.get(k);
    byRule.set(k, { sev: x.severity, n: (prev?.n ?? 0) + 1 });
  }
  let penalty = 0;
  for (const { sev, n } of byRule.values()) penalty += SEVERITY_WEIGHT[sev] + Math.min(n - 1, 4) * Math.ceil(SEVERITY_WEIGHT[sev] / 6);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const has = (s: Severity) => findings.some((x) => x.severity === s);
  const verdict: ScanResult["verdict"] = has("critical") ? "blocked" : has("high") || has("medium") ? "review" : "clean";

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.path.localeCompare(b.path) || a.line - b.line);

  return {
    verdict,
    score,
    findings,
    hosts: [...hostCount.entries()].map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count).slice(0, 30),
    files: perFile,
    stats: { files: files.length, lines, bytes },
  };
}

export const TEXT_FILE = /\.(m?[jt]sx?|cjs|py|sh|bash|zsh|ps1|rb|go|rs|php|lua|md|mdx|txt|ya?ml|json|toml|ini|cfg|env\.example)$|(^|\/)(Dockerfile|Makefile|SKILL)$/i;
