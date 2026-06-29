# Regression Report: v02-handoff-hub-governance-gate

- Timestamp: 20260622T100104Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec v02 governance gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate v02-handoff-hub-governance-gate --type change --strict --no-interactive`

- Result: PASS

```text
Change 'v02-handoff-hub-governance-gate' is valid
```

## BDD and acceptance files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/v02-handoff-hub-governance-gate.md && test -f acceptance/checklists/v02-handoff-hub-governance-gate.md && test -f reports/v0.2-handoff-hub-governance-gate/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
```

## PostgreSQL 17 login shell connectivity

- Evidence: `REAL_TEST`
- Command: `zsh -lc which psql && psql --version && psql "$SARTRE_HUB_DATABASE_URL" -tAc "select 1 as ok;"`

- Result: PASS

```text
/Library/PostgreSQL/17/bin/psql
psql (PostgreSQL) 17.10
1
```

## PostgreSQL 17 dev status

- Evidence: `REAL_TEST`
- Command: `pnpm run pg:dev:status`

- Result: PASS

```text

> sartre@0.1.0 pg:dev:status /Users/xy/personal/Sartre(agent-workspace-design)
> bash scripts/postgres17-dev.sh status

localhost:55432 - accepting connections
```

## Domain tests

- Evidence: `REAL_TEST`
- Command: `pnpm run domain:test`

- Result: PASS

```text

> sartre@0.1.0 domain:test /Users/xy/personal/Sartre(agent-workspace-design)
> pnpm --filter @sartre/domain test


> @sartre/domain@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/packages/domain
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/packages/domain


 Test Files  3 passed (3)
      Tests  7 passed (7)
   Start at  18:01:07
   Duration  244ms (transform 229ms, setup 0ms, import 261ms, tests 11ms, environment 0ms)

```

## Contracts tests

- Evidence: `REAL_TEST`
- Command: `pnpm run contracts:test`

- Result: PASS

```text

> sartre@0.1.0 contracts:test /Users/xy/personal/Sartre(agent-workspace-design)
> pnpm --filter @sartre/contracts test


> @sartre/contracts@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/packages/contracts
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/packages/contracts


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  18:01:08
   Duration  193ms (transform 33ms, setup 0ms, import 66ms, tests 4ms, environment 0ms)

```

## SDK tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk test`

- Result: PASS

```text

> @sartre/sdk@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/packages/sdk
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/packages/sdk


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  18:01:09
   Duration  120ms (transform 31ms, setup 0ms, import 37ms, tests 3ms, environment 0ms)

```

## Hub API tests

- Evidence: `REAL_TEST`
- Command: `pnpm run hub:test`

- Result: PASS

```text

> sartre@0.1.0 hub:test /Users/xy/personal/Sartre(agent-workspace-design)
> pnpm --filter @sartre/hub-api test


> @sartre/hub-api@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api


 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  18:01:09
   Duration  602ms (transform 139ms, setup 0ms, import 573ms, tests 120ms, environment 0ms)

```

## Architecture boundary check

- Evidence: `REAL_TEST`
- Command: `pnpm run architecture:check`

- Result: PASS

```text

> sartre@0.1.0 architecture:check /Users/xy/personal/Sartre(agent-workspace-design)
> tsx scripts/architecture-check.ts

architecture check passed
```

## V0.2 scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:v0.2`

- Result: PASS

```text

> sartre@0.1.0 lint:v0.2 /Users/xy/personal/Sartre(agent-workspace-design)
> biome check package.json apps/hub-api apps/connector-cli apps/web-console packages/domain packages/contracts packages/sdk scripts/architecture-check.ts scripts/postgres17-dev.sh

Checked 43 files in 26ms. No fixes applied.
```

## Domain build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/domain build`

- Result: PASS

```text

> @sartre/domain@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/packages/domain
> tsc -p tsconfig.json --noEmit

```

## Contracts build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts build`

- Result: PASS

```text

> @sartre/contracts@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/packages/contracts
> tsc -p tsconfig.json --noEmit

```

## SDK build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk build`

- Result: PASS

```text

> @sartre/sdk@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/packages/sdk
> tsc -p tsconfig.json --noEmit

```

## Hub API build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api build`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> tsc -p tsconfig.json --noEmit

```

## Connector CLI build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli build`

- Result: PASS

```text

> @sartre/connector-cli@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/connector-cli
> tsc -p tsconfig.json --noEmit

```

## Web Console build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console build`

- Result: PASS

```text

> @sartre/web-console@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/web-console
> tsc -p tsconfig.json --noEmit

```

## Handoff local demo

- Evidence: `REAL_TEST`
- Command: `pnpm run hub:demo:local`

- Result: PASS

```text

> sartre@0.1.0 hub:demo:local /Users/xy/personal/Sartre(agent-workspace-design)
> pnpm --filter @sartre/hub-api demo:local


> @sartre/hub-api@0.1.0 demo:local /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> tsx src/scripts/local-demo.ts

{
  "handoff": "handoff_df52b4c8-afe6-48e3-bb5d-e5e7e4dde805",
  "initial_delivery_status": "pending_delivery",
  "redelivery_status": "delivered",
  "acknowledged_status": "acknowledged",
  "artifacts": [
    "qa-report.md"
  ]
}
```

## Secret scan

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
plan/v0.2-handoff-hub-service-foundation-goal.md:314:/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' README.md plan spec reports apps packages scripts package.json --exclude=.env 2>/dev/null || true
reports/v0.2-handoff-hub-service-foundation/checkpoints/02-service-foundation-closeout.md:212:/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' README.md plan spec reports apps packages scripts package.json --exclude=.env 2>/dev/null || true
scripts/harness-regression.sh:205:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## V0.2 scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- package.json .env.example apps/hub-api apps/connector-cli apps/web-console packages/domain packages/contracts packages/sdk scripts/architecture-check.ts scripts/postgres17-dev.sh scripts/harness-regression.sh plan/v0.2-handoff-hub-service-foundation-goal.md plan/v0.2-handoff-hub-governance-gate-goal.md plan/00-master-plan.md spec/HandoffHubArchitectureSpec.md spec/AgentConnectorUXSpec.md spec/ArchitectureFitnessSpec.md spec/UISpec.md openspec/changes/v02-handoff-hub-governance-gate bdd/features/v02-handoff-hub-governance-gate.md acceptance/checklists/v02-handoff-hub-governance-gate.md reports/v0.2-handoff-hub-service-foundation reports/v0.2-handoff-hub-governance-gate`

- Result: PASS

```text
```

## Full repo historical lint/build/diff gate

- Evidence: `STRUCTURAL_CHECK`
- Result: SKIP
- Reason: not part of v02 scoped gate; known historical blockers remain documented in v0.2 closeout.

## Summary

- Failures: 0
