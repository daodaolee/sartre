# Regression Report: local-connector-mvp

- Timestamp: 20260622T111457Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec local connector MVP

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate local-connector-mvp --type change --strict --no-interactive`

- Result: PASS

```text
Change 'local-connector-mvp' is valid
```

## BDD acceptance and ledger files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/local-connector-mvp.md && test -f acceptance/checklists/local-connector-mvp.md && test -f reports/local-connector-mvp/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
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

## PostgreSQL 17 connectivity

- Evidence: `REAL_TEST`
- Command: `zsh -lc which psql && psql --version && psql "$SARTRE_HUB_DATABASE_URL" -tAc "select 1 as ok;"`

- Result: PASS

```text
/Library/PostgreSQL/17/bin/psql
psql (PostgreSQL) 17.10
1
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
   Start at  19:15:00
   Duration  230ms (transform 68ms, setup 0ms, import 109ms, tests 5ms, environment 0ms)

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
      Tests  2 passed (2)
   Start at  19:15:01
   Duration  172ms (transform 37ms, setup 0ms, import 46ms, tests 5ms, environment 0ms)

```

## Connector CLI tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli test`

- Result: PASS

```text

> @sartre/connector-cli@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/apps/connector-cli
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/apps/connector-cli


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  19:15:02
   Duration  269ms (transform 63ms, setup 0ms, import 82ms, tests 15ms, environment 0ms)

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
      Tests  3 passed (3)
   Start at  19:15:04
   Duration  725ms (transform 168ms, setup 0ms, import 708ms, tests 129ms, environment 0ms)

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

Checked 45 files in 29ms. No fixes applied.
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

## Connector CLI build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli build`

- Result: PASS

```text

> @sartre/connector-cli@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/connector-cli
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

## Local connector demo

- Evidence: `REAL_TEST`
- Command: `pnpm run connector:demo:local`

- Result: PASS

```text

> sartre@0.1.0 connector:demo:local /Users/xy/personal/Sartre(agent-workspace-design)
> pnpm --filter @sartre/hub-api demo:connector-local


> @sartre/hub-api@0.1.0 demo:connector-local /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> tsx src/scripts/local-connector-demo.ts

{
  "hub": "http://127.0.0.1:53770",
  "workspaceDir": "/var/folders/w8/3nv79t053qg0mg74rj2wr5s00000gn/T/sartre-connector-demo-4jGTMD",
  "handoff": "handoff_2ae939f8-eca7-4979-bf07-3a33d6aafd51",
  "initial_delivery_status": "pending_delivery",
  "inbox_entry": "handoff_2ae939f8-eca7-4979-bf07-3a33d6aafd51",
  "acknowledged_status": "acknowledged",
  "sse_delivery_status": "delivered",
  "sse_inbox_entry": "handoff_8520366b-d875-4f72-b6e1-bf1f01ecfed7",
  "artifacts": [
    "qa-report.md"
  ]
}
```

## Secret scan

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:205:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:245:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Local connector scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- package.json pnpm-lock.yaml apps/connector-cli apps/hub-api/package.json apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk scripts/harness-regression.sh openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp`

- Result: PASS

```text
```

## Full repo historical lint/build/diff gate

- Evidence: `STRUCTURAL_CHECK`
- Result: SKIP
- Reason: not part of local connector scoped gate; known historical blockers remain outside this goal.

## Summary

- Failures: 0
