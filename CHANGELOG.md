# Changelog

## 0.1.2

- Default site is now the official domain, https://adyros.com (`ADYROS_SITE_URL` or `--site` still override it).

## 0.1.1

- `adyros demo`: a starter agent for Adyros machines. It logs its start, reads its guarded wallet, tries an unlimited token approval that the guard must refuse, scans a clean and a malicious sample skill, checks an agent before paying it, then keeps a heartbeat on the Proof-of-Behavior log. It never spends funds.
- `runDemo()` exported for use in your own agents.

## 0.1.0

First release.

- Skill Scanner: static rules for key theft, exfiltration, remote code, miners, wallet drains, prompt injection, obfuscation and persistence; verdicts clean, review or blocked.
- Proof of Behavior: canonical JSON, sha256 hash chain, Merkle roots, and verification of a public log against its Base anchors.
- x402 client: pays `exact` requirements with EIP-3009 `transferWithAuthorization` (USDC on Base), with a spending cap.
- `Adyros` client: machine log, guarded wallet (`get`, `send`), free and paid Agent Check.
- CLI: `adyros scan`, `adyros check`, `adyros proof`, with `--json` and `--site`.
- Installable straight from GitHub (`npm install github:ADYROS/adyros-sdk`).
