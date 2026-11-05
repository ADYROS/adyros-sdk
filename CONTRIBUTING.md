# Contributing

Thanks for helping make agents safer.

## Setup

```bash
git clone https://github.com/ADYROS/adyros-sdk
cd adyros-sdk
npm install
npm test
```

Node.js 18.17 or newer. `npm test` builds the package and runs the `node:test` suites.

## Scanner rules

New rules live in `src/scanner/rules.ts`. A good rule has:

- a clear `title` and `why` that a non-expert understands,
- the narrowest pattern that still catches the real attack,
- a test in `test/scanner.test.mjs` with one sample that must be flagged and one that must not.

False positives matter as much as misses: a scanner people ignore protects no one.

## Pull requests

- One change per pull request, with a short description of why.
- Keep the public API stable; note any change in `CHANGELOG.md`.
- CI must pass on Node 20 and 22.

Security issues: see [SECURITY.md](SECURITY.md) instead of opening an issue.
