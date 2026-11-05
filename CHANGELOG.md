# Changelog

## 0.1.0

First release.

- Skill Scanner: static rules for key theft, exfiltration, remote code, miners, wallet drains, prompt injection, obfuscation and persistence; verdicts clean, review or blocked.
- Proof of Behavior: canonical JSON, sha256 hash chain, Merkle roots, and verification of a public log against its Base anchors.
- x402 client: pays `exact` requirements with EIP-3009 `transferWithAuthorization` (USDC on Base), with a spending cap.
- `Adyros` client: machine log, guarded wallet (`get`, `send`), free and paid Agent Check.
- CLI: `adyros scan`, `adyros check`, `adyros proof`, with `--json` and `--site`.
- Installable straight from GitHub (`npm install github:ADYROS/adyros-sdk`).
