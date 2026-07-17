# Sartre

Sartre is an internal multi-user AI-native role collaboration platform. This repository is the clean production rebuild; the legacy MVP is reference-only and remains NO-GO.

Current milestone: **MS0 Repository Constitution and evidence baseline**.

Read in order:

1. `spec/README.md`
2. `plan/00-master-plan.md`
3. `docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md`
4. `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md`

Local unattended credentials live in ignored `/.local-secrets/development.env`. They must never enter Git, logs, reports, Docker contexts, or Electron artifacts.

`pnpm run spec:verify` validates imported target documents from the committed SHA-256 manifest and
therefore works in a clean clone without the legacy checkout. During a local import audit, run
`pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source` to additionally prove
that the approved source, manifest, and target all match.
