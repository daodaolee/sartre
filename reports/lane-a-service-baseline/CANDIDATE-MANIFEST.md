# Lane A Service Baseline Candidate Manifest

Date: 2026-06-26

`lane-a-service-baseline` is the current local Sartre product candidate. It covers the Dev/QA role-collaboration loop.

## Included

- `apps/hub-api/**`
- `apps/web-console/**`
- `apps/connector-cli/**`
- `packages/domain/**`
- `packages/contracts/**`
- `packages/sdk/**`
- `packages/connector-core/**`
- `.agents/capabilities/**`
- current OpenSpec / BDD / acceptance / report artifacts needed by `CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression`
- root TypeScript and workspace config

## Verified Behaviors

- Hub API stores deliveries, events, conversations, model runs, projections and health reports.
- Web Console supports role switching, task board, task creation, detail panel, timeline, agent release, reply, close, settings and capability pages.
- Connector covers local inbox/replay/health and fake/Codex executor boundaries.
- Role capability packs are loaded and exposed as `@` references.
- Conversation ledger remains provider-neutral.

## Verification

```bash
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
```

Latest report:

```text
reports/lane-a-service-baseline/regression/latest.md
```

No commit, push, publish, archive, reset or revert is implied by this manifest.
