# Security policy

This package touches agent wallets and payments, so security reports get priority.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub:
**Security → Report a vulnerability** on this repository
([direct link](https://github.com/ADYROS/adyros-sdk/security/advisories/new)).

Include what you found, how to reproduce it, and the impact you expect. You will get an answer within 72 hours, and a fix or a mitigation plan as soon as the issue is confirmed. Credit is given in the advisory unless you prefer otherwise.

## Scope

- The `adyros` package: SDK, CLI, Skill Scanner rules, Proof-of-Behavior verification and the x402 client.
- Scanner bypasses count: a skill that steals keys or runs hidden code without being flagged is a valid report.

Out of scope: findings that need a compromised machine or a leaked `ADYROS_TOKEN`, and denial of service against public RPC endpoints.

## Supported versions

Only the latest release receives fixes while the package is below 1.0.
