# Goal: Web Console Hub Real Smoke

## Objective

Prove the first-version Web Console operation layer can drive a real Handoff Hub service through public SDK/contracts and observe real persisted state changes.

## Scope

- Add governance artifacts under `openspec/changes/web-console-hub-real-smoke`.
- Add BDD, acceptance, and plan ledger evidence.
- Add a deterministic integration smoke under `scripts/`.
- Add the smoke to Lane A regression.

## Non-Goals

- No new Hub API route design.
- No database schema migration.
- No Web UI redesign.
- No packaging boundary changes.
- No commit, push, archive, reset, or publish.

## Execution Rule

Before and after this goal, compare the current plan against the latest evidence. If the smoke passes, continue to Agent setup/health-check service wiring. If it fails because the service contract is insufficient, stop this slice at evidence and open a service-contract goal.
