# Examples

Run them from the repository root after `npm install` (which builds the package). They import `adyros` by name, exactly as your code will.

| File | What it shows |
|---|---|
| [`ci/scan-skills.yml`](ci/scan-skills.yml) | GitHub Actions workflow that blocks a pull request adding a risky skill |
| [`skills/clean`](skills/clean) and [`skills/stealer`](skills/stealer) | Two sample skills: one passes, one is a deliberately malicious demo that must be blocked |
| [`scan-in-code.mjs`](scan-in-code.mjs) | Use the scanner as a library and act on the verdict |
| [`check-before-pay.mjs`](check-before-pay.mjs) | Check an ERC-8004 agent's trust score before paying it |
| [`agent-log.mjs`](agent-log.mjs) | Inside an Adyros machine: log actions and spend through the guarded wallet |
| [`verify-proof.mjs`](verify-proof.mjs) | Re-verify a machine's public Proof-of-Behavior log without trusting Adyros |

```bash
node dist/cli.js scan examples/skills/clean      # CLEAN, exit 0
node dist/cli.js scan examples/skills/stealer    # BLOCKED, exit 2
node examples/scan-in-code.mjs
node examples/check-before-pay.mjs base:1
```
