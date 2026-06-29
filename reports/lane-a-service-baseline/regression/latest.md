# Regression Report: lane-a-service-baseline

- Timestamp: 20260626T090745Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec agent-capability-model

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate agent-capability-model --type change --strict --no-interactive`

- Result: PASS

```text
Change 'agent-capability-model' is valid
```

## OpenSpec agent-endpoint-health-report-contract

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate agent-endpoint-health-report-contract --type change --strict --no-interactive`

- Result: PASS

```text
Change 'agent-endpoint-health-report-contract' is valid
```

## OpenSpec connector-health-probe-submission

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate connector-health-probe-submission --type change --strict --no-interactive`

- Result: PASS

```text
Change 'connector-health-probe-submission' is valid
```

## OpenSpec connector-trial-run-handoff-loop

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate connector-trial-run-handoff-loop --type change --strict --no-interactive`

- Result: PASS

```text
Change 'connector-trial-run-handoff-loop' is valid
```

## OpenSpec event-store-and-delivery-state

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate event-store-and-delivery-state --type change --strict --no-interactive`

- Result: PASS

```text
Change 'event-store-and-delivery-state' is valid
```

## OpenSpec handoff-hub-service-hardening

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate handoff-hub-service-hardening --type change --strict --no-interactive`

- Result: PASS

```text
Change 'handoff-hub-service-hardening' is valid
```

## OpenSpec local-codex-role-workspace-mvp

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate local-codex-role-workspace-mvp --type change --strict --no-interactive`

- Result: PASS

```text
Change 'local-codex-role-workspace-mvp' is valid
```

## OpenSpec monorepo-package-isolation-governance

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate monorepo-package-isolation-governance --type change --strict --no-interactive`

- Result: PASS

```text
Change 'monorepo-package-isolation-governance' is valid
```

## OpenSpec platform-chat-runtime

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate platform-chat-runtime --type change --strict --no-interactive`

- Result: PASS

```text
Change 'platform-chat-runtime' is valid
```

## OpenSpec provider-model-registry

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate provider-model-registry --type change --strict --no-interactive`

- Result: PASS

```text
Change 'provider-model-registry' is valid
```

## OpenSpec real-codex-executor-adapter

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate real-codex-executor-adapter --type change --strict --no-interactive`

- Result: PASS

```text
Change 'real-codex-executor-adapter' is valid
```

## OpenSpec real-handoff-execution-failure-audit

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate real-handoff-execution-failure-audit --type change --strict --no-interactive`

- Result: PASS

```text
Change 'real-handoff-execution-failure-audit' is valid
```

## OpenSpec regression-evidence-gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate regression-evidence-gate --type change --strict --no-interactive`

- Result: PASS

```text
Change 'regression-evidence-gate' is valid
```

## OpenSpec v02-handoff-hub-governance-gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate v02-handoff-hub-governance-gate --type change --strict --no-interactive`

- Result: PASS

```text
Change 'v02-handoff-hub-governance-gate' is valid
```

## OpenSpec web-console-agent-reconnect-control

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-agent-reconnect-control --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-agent-reconnect-control' is valid
```

## OpenSpec web-console-agent-setup-wizard

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-agent-setup-wizard --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-agent-setup-wizard' is valid
```

## OpenSpec web-console-endpoint-diagnostics

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-endpoint-diagnostics --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-endpoint-diagnostics' is valid
```

## OpenSpec web-console-first-version-loop

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-first-version-loop --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-first-version-loop' is valid
```

## OpenSpec web-console-health-refresh-affordance

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-health-refresh-affordance --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-health-refresh-affordance' is valid
```

## OpenSpec web-console-hub-real-smoke

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-hub-real-smoke --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-hub-real-smoke' is valid
```

## OpenSpec web-console-task-publishing-loop

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-task-publishing-loop --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-task-publishing-loop' is valid
```

## BDD acceptance and ledger structure

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -d bdd/features && test -d acceptance/checklists && test -d reports/lane-a-service-baseline && test -f reports/lane-a-service-baseline/CANDIDATE-MANIFEST.md`

- Result: PASS

```text
```

## Domain tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/domain test`

- Result: PASS

```text

> @sartre/domain@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/domain
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/domain


 Test Files  3 passed (3)
      Tests  13 passed (13)
   Start at  17:10:02
   Duration  3.11s (transform 2.74s, setup 0ms, import 3.29s, tests 266ms, environment 0ms)

```

## Contracts tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts test`

- Result: PASS

```text

> @sartre/contracts@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/contracts
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/contracts


 Test Files  3 passed (3)
      Tests  26 passed (26)
   Start at  17:10:09
   Duration  2.85s (transform 2.00s, setup 0ms, import 4.19s, tests 142ms, environment 0ms)

```

## SDK tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk test`

- Result: PASS

```text

> @sartre/sdk@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/sdk
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/sdk


 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  17:10:13
   Duration  694ms (transform 311ms, setup 0ms, import 467ms, tests 43ms, environment 0ms)

```

## Connector Core tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-core test`

- Result: PASS

```text

> @sartre/connector-core@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/connector-core
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/connector-core


 Test Files  2 passed (2)
      Tests  29 passed (29)
   Start at  17:10:15
   Duration  1.59s (transform 1.05s, setup 0ms, import 1.90s, tests 505ms, environment 0ms)

```

## Connector CLI tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli test`

- Result: PASS

```text

> @sartre/connector-cli@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/connector-cli
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/connector-cli


 Test Files  1 passed (1)
      Tests  17 passed (17)
   Start at  17:10:18
   Duration  847ms (transform 366ms, setup 0ms, import 534ms, tests 98ms, environment 0ms)

```

## Hub API tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api test`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/hub-api
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/hub-api


 Test Files  7 passed (7)
      Tests  24 passed (24)
   Start at  17:10:20
   Duration  10.81s (transform 862ms, setup 0ms, import 6.68s, tests 1.99s, environment 1ms)

```

## Web Console tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console test`

- Result: PASS

```text

> @sartre/web-console@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/web-console
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/web-console


 Test Files  4 passed (4)
      Tests  36 passed (36)
   Start at  17:10:32
   Duration  8.65s (transform 1.43s, setup 0ms, import 3.23s, tests 4.85s, environment 2.46s)

```

## Web Console Hub real smoke

- Evidence: `REAL_TEST`
- Command: `pnpm run web:smoke:hub`

- Result: PASS

```text

> sartre@0.1.0 web:smoke:hub /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625
> vitest run scripts/web-console-hub-real-smoke.test.ts


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  17:10:52
   Duration  59.23s (transform 14.00s, setup 0ms, import 32.36s, tests 20.37s, environment 0ms)

```

## Domain build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/domain build`

- Result: PASS

```text

> @sartre/domain@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/domain
> tsc -p tsconfig.json --noEmit

```

## Contracts build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts build`

- Result: PASS

```text

> @sartre/contracts@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/contracts
> tsc -p tsconfig.json --noEmit

```

## SDK build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk build`

- Result: PASS

```text

> @sartre/sdk@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/sdk
> tsc -p tsconfig.json --noEmit

```

## Connector Core build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-core build`

- Result: PASS

```text

> @sartre/connector-core@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/packages/connector-core
> tsc -p tsconfig.json --noEmit

```

## Connector CLI build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli build`

- Result: PASS

```text

> @sartre/connector-cli@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/connector-cli
> tsc -p tsconfig.json --noEmit

```

## Hub API build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api build`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/hub-api
> tsc -p tsconfig.json --noEmit

```

## Web Console build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console build`

- Result: PASS

```text

> @sartre/web-console@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/apps/web-console
> tsc -p tsconfig.json --noEmit && vite build

vite v7.3.5 building client environment for production...
transforming...
✓ 177 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.74 kB │ gzip:   0.47 kB
dist/assets/index-CXGgoiQg.css   47.28 kB │ gzip:   6.98 kB
dist/assets/index-CEn8Qimr.js   803.61 kB │ gzip: 246.32 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 7.06s
```

## Lane A scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:lane-a`

- Result: PASS

```text

> sartre@0.1.0 lint:lane-a /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625
> biome check package.json apps/hub-api apps/web-console apps/connector-cli packages/domain packages/contracts packages/sdk packages/connector-core scripts/architecture-check.ts scripts/architecture-check.test.ts scripts/evidence-gate.ts scripts/evidence-gate.test.ts scripts/web-console-hub-real-smoke.test.ts scripts/postgres17-dev.sh

Checked 97 files in 412ms. No fixes applied.
```

## Architecture boundary check

- Evidence: `REAL_TEST`
- Command: `pnpm run architecture:check`

- Result: PASS

```text

> sartre@0.1.0 architecture:check /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625
> tsx scripts/architecture-check.ts

architecture check passed
```

## Secret scan

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *= *[A-Za-z0-9_-]{12,}|token *= *[A-Za-z0-9_-]{12,}' apps packages .agents openspec bdd acceptance plan docs spec workflow scripts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:144:  bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *= *[A-Za-z0-9_-]{12,}|token *= *[A-Za-z0-9_-]{12,}'\'' apps packages .agents openspec bdd acceptance plan docs spec workflow scripts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- . :!node_modules`

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

> sartre@0.1.0 harness:evidence /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625
> tsx scripts/evidence-gate.ts -- --change lane-a-service-baseline

Evidence gate passed: /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625/reports/lane-a-service-baseline/regression/latest.md (41 checks, 19 REAL_TEST)
```

