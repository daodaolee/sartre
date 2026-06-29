# Regression Report: lane-a-service-baseline

- Timestamp: 20260623T113325Z
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

## OpenSpec regression evidence gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate regression-evidence-gate --type change --strict --no-interactive`

- Result: PASS

```text
Change 'regression-evidence-gate' is valid
```

## OpenSpec Web Console first version loop

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-first-version-loop --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-first-version-loop' is valid
```

## OpenSpec Web Console Hub real smoke

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-hub-real-smoke --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-hub-real-smoke' is valid
```

## OpenSpec Web Console agent reconnect control

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-agent-reconnect-control --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-agent-reconnect-control' is valid
```

## OpenSpec Web Console endpoint diagnostics

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-endpoint-diagnostics --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-endpoint-diagnostics' is valid
```

## OpenSpec Web Console agent setup wizard

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-agent-setup-wizard --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-agent-setup-wizard' is valid
```

## OpenSpec AgentEndpoint health report contract

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate agent-endpoint-health-report-contract --type change --strict --no-interactive`

- Result: PASS

```text
Change 'agent-endpoint-health-report-contract' is valid
```

## Lane A BDD acceptance and ledger files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/v02-handoff-hub-governance-gate.md && test -f bdd/features/event-store-and-delivery-state.md && test -f bdd/features/handoff-hub-service-hardening.md && test -f bdd/features/monorepo-package-isolation-governance.md && test -f bdd/features/regression-evidence-gate.md && test -f bdd/features/web-console-first-version-loop.md && test -f bdd/features/web-console-hub-real-smoke.md && test -f bdd/features/web-console-agent-reconnect-control.md && test -f bdd/features/web-console-endpoint-diagnostics.md && test -f bdd/features/web-console-agent-setup-wizard.md && test -f acceptance/checklists/v02-handoff-hub-governance-gate.md && test -f acceptance/checklists/event-store-and-delivery-state.md && test -f acceptance/checklists/handoff-hub-service-hardening.md && test -f acceptance/checklists/monorepo-package-isolation-governance.md && test -f acceptance/checklists/regression-evidence-gate.md && test -f acceptance/checklists/web-console-first-version-loop.md && test -f acceptance/checklists/web-console-hub-real-smoke.md && test -f acceptance/checklists/web-console-agent-reconnect-control.md && test -f acceptance/checklists/web-console-endpoint-diagnostics.md && test -f acceptance/checklists/web-console-agent-setup-wizard.md && test -f reports/v0.2-handoff-hub-governance-gate/checkpoints/PLAN_LEDGER.md && test -f reports/event-store-and-delivery-state/checkpoints/PLAN_LEDGER.md && test -f reports/handoff-hub-service-hardening/checkpoints/PLAN_LEDGER.md && test -f reports/monorepo-package-isolation-governance/checkpoints/PLAN_LEDGER.md && test -f reports/regression-evidence-gate/checkpoints/PLAN_LEDGER.md && test -f reports/web-console-first-version-loop/checkpoints/PLAN_LEDGER.md && test -f reports/web-console-hub-real-smoke/checkpoints/PLAN_LEDGER.md && test -f reports/web-console-agent-reconnect-control/checkpoints/PLAN_LEDGER.md && test -f reports/web-console-endpoint-diagnostics/checkpoints/PLAN_LEDGER.md && test -f reports/web-console-agent-setup-wizard/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
```

## Lane A AgentEndpoint health report files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/agent-endpoint-health-report-contract.md && test -f acceptance/checklists/agent-endpoint-health-report-contract.md && test -f reports/agent-endpoint-health-report-contract/checkpoints/PLAN_LEDGER.md`

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
   Start at  19:33:46
   Duration  236ms (transform 227ms, setup 0ms, import 267ms, tests 17ms, environment 0ms)

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
      Tests  10 passed (10)
   Start at  19:33:47
   Duration  213ms (transform 45ms, setup 0ms, import 93ms, tests 17ms, environment 0ms)

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
      Tests  9 passed (9)
   Start at  19:33:48
   Duration  355ms (transform 89ms, setup 0ms, import 134ms, tests 13ms, environment 0ms)

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
   Start at  19:33:49
   Duration  259ms (transform 68ms, setup 0ms, import 131ms, tests 11ms, environment 0ms)

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
      Tests  11 passed (11)
   Start at  19:33:49
   Duration  1.00s (transform 364ms, setup 0ms, import 1.02s, tests 326ms, environment 0ms)

```

## Web Console tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console test`

- Result: PASS

```text

> @sartre/web-console@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/apps/web-console
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/apps/web-console


 Test Files  4 passed (4)
      Tests  28 passed (28)
   Start at  19:33:51
   Duration  1.86s (transform 255ms, setup 0ms, import 582ms, tests 829ms, environment 687ms)

```

## Web Console Hub real smoke

- Evidence: `REAL_TEST`
- Command: `pnpm run web:smoke:hub`

- Result: PASS

```text

> sartre@0.1.0 web:smoke:hub /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline
> vitest run scripts/web-console-hub-real-smoke.test.ts


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline


 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  19:33:53
   Duration  729ms (transform 144ms, setup 0ms, import 383ms, tests 235ms, environment 0ms)

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

## Web Console build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console build`

- Result: PASS

```text

> @sartre/web-console@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/apps/web-console
> tsc -p tsconfig.json --noEmit && vite build

vite v7.3.5 building client environment for production...
transforming...
✓ 113 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.74 kB │ gzip:  0.47 kB
dist/assets/index-BA_cHZz-.css   21.18 kB │ gzip:  3.83 kB
dist/assets/index--DZDAg42.js   294.85 kB │ gzip: 87.34 kB
✓ built in 809ms
```

## Lane A scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:lane-a`

- Result: PASS

```text

> sartre@0.1.0 lint:lane-a /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline
> biome check package.json apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core scripts/architecture-check.ts scripts/architecture-check.test.ts scripts/evidence-gate.ts scripts/evidence-gate.test.ts scripts/web-console-hub-real-smoke.test.ts scripts/postgres17-dev.sh

Checked 68 files in 59ms. No fixes applied.
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
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance openspec/changes/regression-evidence-gate openspec/changes/web-console-first-version-loop openspec/changes/web-console-hub-real-smoke openspec/changes/web-console-agent-reconnect-control openspec/changes/web-console-endpoint-diagnostics bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md bdd/features/regression-evidence-gate.md bdd/features/web-console-first-version-loop.md bdd/features/web-console-hub-real-smoke.md bdd/features/web-console-agent-reconnect-control.md bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md acceptance/checklists/regression-evidence-gate.md acceptance/checklists/web-console-first-version-loop.md acceptance/checklists/web-console-hub-real-smoke.md acceptance/checklists/web-console-agent-reconnect-control.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-hub-real-smoke-goal.md plan/web-console-agent-reconnect-control-goal.md plan/web-console-endpoint-diagnostics-goal.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance reports/regression-evidence-gate reports/web-console-first-version-loop reports/web-console-hub-real-smoke reports/web-console-agent-reconnect-control reports/web-console-endpoint-diagnostics scripts/harness-regression.sh scripts/evidence-gate.ts scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:238:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:278:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:306:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console apps/connector-cli openspec/changes/web-console-connector-onboarding bdd/features/web-console-connector-onboarding.md acceptance/checklists/web-console-connector-onboarding.md plan/web-console-connector-onboarding-goal.md reports/web-console-connector-onboarding scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:330:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-control-surface bdd/features/web-console-control-surface.md acceptance/checklists/web-console-control-surface.md reports/web-console-control-surface scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:352:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-vercel-geist-alignment bdd/features/web-console-vercel-geist-alignment.md acceptance/checklists/web-console-vercel-geist-alignment.md reports/web-console-vercel-geist-alignment scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:386:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-backed-overview bdd/features/web-console-hub-backed-overview.md acceptance/checklists/web-console-hub-backed-overview.md plan/web-console-hub-backed-overview-goal.md reports/web-console-hub-backed-overview scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:420:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console packages/contracts packages/sdk openspec/changes/web-console-user-operation-integration bdd/features/web-console-user-operation-integration.md acceptance/checklists/web-console-user-operation-integration.md plan/web-console-user-operation-integration-goal.md reports/web-console-user-operation-integration scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:452:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-real-smoke bdd/features/web-console-hub-real-smoke.md acceptance/checklists/web-console-hub-real-smoke.md plan/web-console-hub-real-smoke-goal.md reports/web-console-hub-real-smoke scripts/harness-regression.sh scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:474:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-reconnect-control bdd/features/web-console-agent-reconnect-control.md acceptance/checklists/web-console-agent-reconnect-control.md plan/web-console-agent-reconnect-control-goal.md reports/web-console-agent-reconnect-control scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:496:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-endpoint-diagnostics bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-endpoint-diagnostics-goal.md reports/web-console-endpoint-diagnostics scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:518:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:552:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:590:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:620:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api packages/contracts packages/sdk openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:686:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance openspec/changes/regression-evidence-gate openspec/changes/web-console-first-version-loop openspec/changes/web-console-hub-real-smoke openspec/changes/web-console-agent-reconnect-control openspec/changes/web-console-endpoint-diagnostics bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md bdd/features/regression-evidence-gate.md bdd/features/web-console-first-version-loop.md bdd/features/web-console-hub-real-smoke.md bdd/features/web-console-agent-reconnect-control.md bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md acceptance/checklists/regression-evidence-gate.md acceptance/checklists/web-console-first-version-loop.md acceptance/checklists/web-console-hub-real-smoke.md acceptance/checklists/web-console-agent-reconnect-control.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-hub-real-smoke-goal.md plan/web-console-agent-reconnect-control-goal.md plan/web-console-endpoint-diagnostics-goal.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance reports/regression-evidence-gate reports/web-console-first-version-loop reports/web-console-hub-real-smoke reports/web-console-agent-reconnect-control reports/web-console-endpoint-diagnostics scripts/harness-regression.sh scripts/evidence-gate.ts scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:690:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:694:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Lane A scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- package.json apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core scripts/architecture-check.ts scripts/architecture-check.test.ts scripts/evidence-gate.ts scripts/evidence-gate.test.ts scripts/web-console-hub-real-smoke.test.ts scripts/postgres17-dev.sh scripts/harness-regression.sh openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance openspec/changes/regression-evidence-gate openspec/changes/web-console-first-version-loop openspec/changes/web-console-hub-real-smoke openspec/changes/web-console-agent-reconnect-control openspec/changes/web-console-endpoint-diagnostics bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md bdd/features/regression-evidence-gate.md bdd/features/web-console-first-version-loop.md bdd/features/web-console-hub-real-smoke.md bdd/features/web-console-agent-reconnect-control.md bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md acceptance/checklists/regression-evidence-gate.md acceptance/checklists/web-console-first-version-loop.md acceptance/checklists/web-console-hub-real-smoke.md acceptance/checklists/web-console-agent-reconnect-control.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-hub-real-smoke-goal.md plan/web-console-agent-reconnect-control-goal.md plan/web-console-endpoint-diagnostics-goal.md reports/v0.2-handoff-hub-governance-gate/checkpoints reports/event-store-and-delivery-state/checkpoints reports/handoff-hub-service-hardening/checkpoints reports/monorepo-package-isolation-governance/checkpoints reports/regression-evidence-gate/checkpoints reports/web-console-first-version-loop/checkpoints reports/web-console-hub-real-smoke/checkpoints reports/web-console-agent-reconnect-control/checkpoints reports/web-console-endpoint-diagnostics/checkpoints`

- Result: PASS

```text
```

## Lane A agent setup wizard secret scope

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:238:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:278:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:306:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console apps/connector-cli openspec/changes/web-console-connector-onboarding bdd/features/web-console-connector-onboarding.md acceptance/checklists/web-console-connector-onboarding.md plan/web-console-connector-onboarding-goal.md reports/web-console-connector-onboarding scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:330:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-control-surface bdd/features/web-console-control-surface.md acceptance/checklists/web-console-control-surface.md reports/web-console-control-surface scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:352:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-vercel-geist-alignment bdd/features/web-console-vercel-geist-alignment.md acceptance/checklists/web-console-vercel-geist-alignment.md reports/web-console-vercel-geist-alignment scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:386:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-backed-overview bdd/features/web-console-hub-backed-overview.md acceptance/checklists/web-console-hub-backed-overview.md plan/web-console-hub-backed-overview-goal.md reports/web-console-hub-backed-overview scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:420:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console packages/contracts packages/sdk openspec/changes/web-console-user-operation-integration bdd/features/web-console-user-operation-integration.md acceptance/checklists/web-console-user-operation-integration.md plan/web-console-user-operation-integration-goal.md reports/web-console-user-operation-integration scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:452:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-real-smoke bdd/features/web-console-hub-real-smoke.md acceptance/checklists/web-console-hub-real-smoke.md plan/web-console-hub-real-smoke-goal.md reports/web-console-hub-real-smoke scripts/harness-regression.sh scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:474:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-reconnect-control bdd/features/web-console-agent-reconnect-control.md acceptance/checklists/web-console-agent-reconnect-control.md plan/web-console-agent-reconnect-control-goal.md reports/web-console-agent-reconnect-control scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:496:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-endpoint-diagnostics bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-endpoint-diagnostics-goal.md reports/web-console-endpoint-diagnostics scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:518:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:552:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:590:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:620:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api packages/contracts packages/sdk openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:686:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance openspec/changes/regression-evidence-gate openspec/changes/web-console-first-version-loop openspec/changes/web-console-hub-real-smoke openspec/changes/web-console-agent-reconnect-control openspec/changes/web-console-endpoint-diagnostics bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md bdd/features/regression-evidence-gate.md bdd/features/web-console-first-version-loop.md bdd/features/web-console-hub-real-smoke.md bdd/features/web-console-agent-reconnect-control.md bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md acceptance/checklists/regression-evidence-gate.md acceptance/checklists/web-console-first-version-loop.md acceptance/checklists/web-console-hub-real-smoke.md acceptance/checklists/web-console-agent-reconnect-control.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-hub-real-smoke-goal.md plan/web-console-agent-reconnect-control-goal.md plan/web-console-endpoint-diagnostics-goal.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance reports/regression-evidence-gate reports/web-console-first-version-loop reports/web-console-hub-real-smoke reports/web-console-agent-reconnect-control reports/web-console-endpoint-diagnostics scripts/harness-regression.sh scripts/evidence-gate.ts scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:690:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:694:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Lane A agent setup wizard diff scope

- Evidence: `REAL_TEST`
- Command: `git diff --check -- apps/web-console scripts/harness-regression.sh openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard/checkpoints`

- Result: PASS

```text
```

## Lane A AgentEndpoint health report secret scope

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:238:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:278:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:306:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console apps/connector-cli openspec/changes/web-console-connector-onboarding bdd/features/web-console-connector-onboarding.md acceptance/checklists/web-console-connector-onboarding.md plan/web-console-connector-onboarding-goal.md reports/web-console-connector-onboarding scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:330:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-control-surface bdd/features/web-console-control-surface.md acceptance/checklists/web-console-control-surface.md reports/web-console-control-surface scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:352:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-vercel-geist-alignment bdd/features/web-console-vercel-geist-alignment.md acceptance/checklists/web-console-vercel-geist-alignment.md reports/web-console-vercel-geist-alignment scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:386:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-backed-overview bdd/features/web-console-hub-backed-overview.md acceptance/checklists/web-console-hub-backed-overview.md plan/web-console-hub-backed-overview-goal.md reports/web-console-hub-backed-overview scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:420:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console packages/contracts packages/sdk openspec/changes/web-console-user-operation-integration bdd/features/web-console-user-operation-integration.md acceptance/checklists/web-console-user-operation-integration.md plan/web-console-user-operation-integration-goal.md reports/web-console-user-operation-integration scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:452:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-real-smoke bdd/features/web-console-hub-real-smoke.md acceptance/checklists/web-console-hub-real-smoke.md plan/web-console-hub-real-smoke-goal.md reports/web-console-hub-real-smoke scripts/harness-regression.sh scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:474:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-reconnect-control bdd/features/web-console-agent-reconnect-control.md acceptance/checklists/web-console-agent-reconnect-control.md plan/web-console-agent-reconnect-control-goal.md reports/web-console-agent-reconnect-control scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:496:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-endpoint-diagnostics bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-endpoint-diagnostics-goal.md reports/web-console-endpoint-diagnostics scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:518:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:552:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:590:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:620:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api packages/contracts packages/sdk openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:686:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance openspec/changes/regression-evidence-gate openspec/changes/web-console-first-version-loop openspec/changes/web-console-hub-real-smoke openspec/changes/web-console-agent-reconnect-control openspec/changes/web-console-endpoint-diagnostics bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md bdd/features/regression-evidence-gate.md bdd/features/web-console-first-version-loop.md bdd/features/web-console-hub-real-smoke.md bdd/features/web-console-agent-reconnect-control.md bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md acceptance/checklists/regression-evidence-gate.md acceptance/checklists/web-console-first-version-loop.md acceptance/checklists/web-console-hub-real-smoke.md acceptance/checklists/web-console-agent-reconnect-control.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-hub-real-smoke-goal.md plan/web-console-agent-reconnect-control-goal.md plan/web-console-endpoint-diagnostics-goal.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance reports/regression-evidence-gate reports/web-console-first-version-loop reports/web-console-hub-real-smoke reports/web-console-agent-reconnect-control reports/web-console-endpoint-diagnostics scripts/harness-regression.sh scripts/evidence-gate.ts scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:690:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:694:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Lane A AgentEndpoint health report diff scope

- Evidence: `REAL_TEST`
- Command: `git diff --check -- apps/hub-api apps/web-console packages/contracts packages/sdk scripts/harness-regression.sh openspec/changes/agent-endpoint-health-report-contract bdd/features/agent-endpoint-health-report-contract.md acceptance/checklists/agent-endpoint-health-report-contract.md plan/agent-endpoint-health-report-contract-goal.md reports/agent-endpoint-health-report-contract/checkpoints`

- Result: PASS

```text
```

## Summary

- Failures: 0
## Regression evidence gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm harness:evidence -- --change lane-a-service-baseline`
- Result: PASS

```text

> sartre@0.1.0 harness:evidence /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline
> tsx scripts/evidence-gate.ts -- --change lane-a-service-baseline

Evidence gate passed: /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline/reports/lane-a-service-baseline/regression/latest.md (34 checks, 21 REAL_TEST)
```

