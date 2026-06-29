# Acceptance Checklist: local-codex-role-workspace-mvp

## Scope

- Codex-only local executor MVP.
- Role Agent / endpoint / runtime binding language.
- No first-class computer management surface.
- Existing handoff, provider registry, and conversation ledger reused.

## Checks

- [ ] `POST /deliveries/:deliveryId/start` exists, is tested, and rejects illegal transitions.
- [ ] SDK exposes `startDelivery()` and connector uses SDK instead of Hub internals.
- [ ] Connector has deterministic fake Codex executor tests.
- [ ] Connector can execute an accepted delivery and write model-run/transcript/report-ready facts.
- [ ] Web Console task detail shows execution status/transcript/report artifact from Hub facts.
- [ ] Web Console has no `computer` top-level navigation or required setup step.
- [ ] Contract metadata/error paths reject or redact secret-like values.
- [ ] Architecture check passes for monorepo package boundaries.
- [ ] OpenSpec strict validation passes.
- [ ] Fake executor smoke is `REAL_TEST`.
- [ ] Real Codex smoke is either `REAL_TEST` with command evidence or `SKIPPED` with exact reason.

## Non-Goals

- [ ] No Claude/OpenCode/Gemini executor implementation.
- [ ] No provider API key editor.
- [ ] No cloud runtime.
- [ ] No autonomous auto-close without human check.
- [ ] No dedicated computer management page.
