# Regression Report: lane-a-service-baseline

- Timestamp: 20260623T092645Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec v02 governance gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate v02-handoff-hub-governance-gate --type change --strict --no-interactive`

- Result: PASS

```text
Change 'v02-handoff-hub-governance-gate' is valid
```

## OpenSpec event store and delivery state

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate event-store-and-delivery-state --type change --strict --no-interactive`

- Result: PASS

```text
Change 'event-store-and-delivery-state' is valid
```

## OpenSpec Handoff Hub service hardening

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate handoff-hub-service-hardening --type change --strict --no-interactive`

- Result: PASS

```text
Change 'handoff-hub-service-hardening' is valid
```

## OpenSpec monorepo package isolation governance

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate monorepo-package-isolation-governance --type change --strict --no-interactive`

- Result: PASS

```text
Change 'monorepo-package-isolation-governance' is valid
```

## Lane A BDD acceptance and ledger files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/v02-handoff-hub-governance-gate.md && test -f bdd/features/event-store-and-delivery-state.md && test -f bdd/features/handoff-hub-service-hardening.md && test -f bdd/features/monorepo-package-isolation-governance.md && test -f acceptance/checklists/v02-handoff-hub-governance-gate.md && test -f acceptance/checklists/event-store-and-delivery-state.md && test -f acceptance/checklists/handoff-hub-service-hardening.md && test -f acceptance/checklists/monorepo-package-isolation-governance.md && test -f reports/v0.2-handoff-hub-governance-gate/checkpoints/PLAN_LEDGER.md && test -f reports/event-store-and-delivery-state/checkpoints/PLAN_LEDGER.md && test -f reports/handoff-hub-service-hardening/checkpoints/PLAN_LEDGER.md && test -f reports/monorepo-package-isolation-governance/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
```

## Domain tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/domain test`

- Result: PASS

```text

> @sartre/domain@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/domain
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/domain


 Test Files  3 passed (3)
      Tests  9 passed (9)
   Start at  17:26:52
   Duration  205ms (transform 217ms, setup 0ms, import 251ms, tests 11ms, environment 0ms)

```

## Contracts tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts test`

- Result: PASS

```text

> @sartre/contracts@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/contracts
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/contracts


 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  17:26:53
   Duration  172ms (transform 41ms, setup 0ms, import 79ms, tests 5ms, environment 0ms)

```

## SDK tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk test`

- Result: PASS

```text

> @sartre/sdk@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/sdk
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/sdk


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  17:26:54
   Duration  208ms (transform 56ms, setup 0ms, import 96ms, tests 19ms, environment 0ms)

```

## Connector Core tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-core test`

- Result: PASS

```text

> @sartre/connector-core@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/connector-core
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/connector-core


 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  17:26:54
   Duration  202ms (transform 63ms, setup 0ms, import 105ms, tests 9ms, environment 0ms)

```

## Hub API tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api test`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/apps/hub-api
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/apps/hub-api


 Test Files  4 passed (4)
      Tests  9 passed (9)
   Start at  17:26:55
   Duration  756ms (transform 284ms, setup 0ms, import 793ms, tests 239ms, environment 0ms)

```

## Domain build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/domain build`

- Result: PASS

```text

> @sartre/domain@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/domain
> tsc -p tsconfig.json --noEmit

```

## Contracts build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts build`

- Result: PASS

```text

> @sartre/contracts@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/contracts
> tsc -p tsconfig.json --noEmit

```

## SDK build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk build`

- Result: PASS

```text

> @sartre/sdk@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/sdk
> tsc -p tsconfig.json --noEmit

```

## Connector Core build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-core build`

- Result: PASS

```text

> @sartre/connector-core@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/packages/connector-core
> tsc -p tsconfig.json --noEmit

```

## Hub API build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api build`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/apps/hub-api
> tsc -p tsconfig.json --noEmit

```

## Lane A scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:lane-a`

- Result: PASS

```text

> sartre@0.1.0 lint:lane-a /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline
> biome check package.json apps/hub-api packages/domain packages/contracts packages/sdk packages/connector-core scripts/architecture-check.ts scripts/postgres17-dev.sh

Checked 49 files in 40ms. No fixes applied.
```

## Architecture boundary check

- Evidence: `REAL_TEST`
- Command: `pnpm run architecture:check`

- Result: PASS

```text

> sartre@0.1.0 architecture:check /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline
> tsx scripts/architecture-check.ts

architecture check passed
```

## Lane A secret scan

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/hub-api packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:205:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:245:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:273:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console apps/connector-cli openspec/changes/web-console-connector-onboarding bdd/features/web-console-connector-onboarding.md acceptance/checklists/web-console-connector-onboarding.md plan/web-console-connector-onboarding-goal.md reports/web-console-connector-onboarding scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:297:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-control-surface bdd/features/web-console-control-surface.md acceptance/checklists/web-console-control-surface.md reports/web-console-control-surface scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:319:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-vercel-geist-alignment bdd/features/web-console-vercel-geist-alignment.md acceptance/checklists/web-console-vercel-geist-alignment.md reports/web-console-vercel-geist-alignment scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:353:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-backed-overview bdd/features/web-console-hub-backed-overview.md acceptance/checklists/web-console-hub-backed-overview.md plan/web-console-hub-backed-overview-goal.md reports/web-console-hub-backed-overview scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:387:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console packages/contracts packages/sdk openspec/changes/web-console-user-operation-integration bdd/features/web-console-user-operation-integration.md acceptance/checklists/web-console-user-operation-integration.md plan/web-console-user-operation-integration-goal.md reports/web-console-user-operation-integration scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:425:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:455:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api packages/contracts packages/sdk openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:499:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Lane A scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- package.json apps/hub-api packages/domain packages/contracts packages/sdk packages/connector-core scripts/architecture-check.ts scripts/postgres17-dev.sh scripts/harness-regression.sh openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md reports/v0.2-handoff-hub-governance-gate/checkpoints reports/event-store-and-delivery-state/checkpoints reports/handoff-hub-service-hardening/checkpoints reports/monorepo-package-isolation-governance/checkpoints`

- Result: PASS

```text
```

## Web Console lane checks

- Evidence: `STRUCTURAL_CHECK`
- Result: SKIP
- Reason: not part of Lane A service baseline candidate; Web Console remains Lane B.

## Summary

- Failures: 0
