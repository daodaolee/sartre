# Acceptance Checklist: Handoff Hub Service Hardening

## Product Acceptance

- [x] Terminal delivery commands return classified user-facing errors instead of default 500s.
- [x] Reconnecting clients can replay persisted delivery lifecycle facts by cursor.
- [x] Local Dev/QA fixture is stable for later Web Console simulation.
- [x] Hub payloads remain metadata/free-form and do not force role-specific structures.

## Engineering Acceptance

- [x] PostgreSQL schema is defined in executable migration files.
- [x] Migration runner is idempotent and creates a migration ledger.
- [x] `DatabaseService` uses the migration runner.
- [x] Error responses use a versioned envelope with `category` and `message`.
- [x] `IllegalTransitionError` maps to HTTP 400 `InvalidInput`.
- [x] Missing delivery commands map to HTTP 404 `Unavailable`.
- [x] Replay endpoint is tenant and endpoint scoped.
- [x] SDK exposes replay through public Hub API.
- [x] Architecture check confirms clients do not import `apps/hub-api/src/**`.
- [x] No Web Console production UI changes.
- [x] No runtime packaging changes.

## Verification

- [x] `pnpm --filter @sartre/hub-api test`
- [x] `pnpm --filter @sartre/hub-api build`
- [x] `pnpm --filter @sartre/contracts test`
- [x] `pnpm --filter @sartre/contracts build`
- [x] `pnpm --filter @sartre/sdk test`
- [x] `pnpm --filter @sartre/sdk build`
- [x] `pnpm run lint:v0.2`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=handoff-hub-service-hardening pnpm harness:regression`

## Evidence

- Regression: `reports/handoff-hub-service-hardening/regression/20260623T070943Z-regression-report.md`
- Closeout: `reports/handoff-hub-service-hardening/checkpoints/02-final-closeout-20260623T070811Z.md`
