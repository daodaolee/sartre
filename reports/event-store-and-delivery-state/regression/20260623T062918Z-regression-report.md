# Regression Report: event-store-and-delivery-state

- Timestamp: 20260623T062918Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec event store and delivery state

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate event-store-and-delivery-state --type change --strict --no-interactive`

- Result: PASS

```text
Change 'event-store-and-delivery-state' is valid
```

## BDD acceptance and ledger files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/event-store-and-delivery-state.md && test -f acceptance/checklists/event-store-and-delivery-state.md && test -f reports/event-store-and-delivery-state/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
```

## Domain tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/domain test`

- Result: PASS

```text

> @sartre/domain@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/packages/domain
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/packages/domain


 Test Files  3 passed (3)
      Tests  9 passed (9)
   Start at  14:29:22
   Duration  250ms (transform 249ms, setup 0ms, import 293ms, tests 12ms, environment 0ms)

```

## Contracts tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts test`

- Result: PASS

```text

> @sartre/contracts@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/packages/contracts
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/packages/contracts


 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  14:29:23
   Duration  211ms (transform 42ms, setup 0ms, import 91ms, tests 5ms, environment 0ms)

```

## Hub API tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api test`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api

[Nest] 28580  - 06/23/2026, 2:29:25 PM   ERROR [ExceptionsHandler] IllegalTransitionError: Illegal transition from expired to acknowledged
    at Delivery.acknowledge (/Users/xy/personal/Sartre(agent-workspace-design)/packages/domain/src/handoff/delivery.ts:138:13)
    at /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api/src/modules/handoff/infrastructure/postgres/postgres-handoff.repository.ts:312:50
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at PostgresHandoffRepository.withTransaction (/Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api/src/modules/handoff/infrastructure/postgres/postgres-handoff.repository.ts:716:22)
    at /Users/xy/personal/Sartre(agent-workspace-design)/node_modules/.pnpm/@nestjs+core@11.1.27_@nestjs+common@11.1.27_reflect-metadata@0.2.2_rxjs@7.8.2__@nestjs+_678d8367b6ebdd1429d0393fb65d07e5/node_modules/@nestjs/core/router/router-execution-context.js:47:62
    at /Users/xy/personal/Sartre(agent-workspace-design)/node_modules/.pnpm/@nestjs+core@11.1.27_@nestjs+common@11.1.27_reflect-metadata@0.2.2_rxjs@7.8.2__@nestjs+_678d8367b6ebdd1429d0393fb65d07e5/node_modules/@nestjs/core/router/router-proxy.js:9:17 {
  category: 'InvalidInput'
}

 Test Files  2 passed (2)
      Tests  5 passed (5)
   Start at  14:29:24
   Duration  1.62s (transform 412ms, setup 0ms, import 1.18s, tests 624ms, environment 0ms)

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
      Tests  5 passed (5)
   Start at  14:29:26
   Duration  375ms (transform 85ms, setup 0ms, import 197ms, tests 16ms, environment 0ms)

```

## Web Console tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console test`

- Result: PASS

```text

> @sartre/web-console@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/apps/web-console
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/apps/web-console


 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  14:29:28
   Duration  4.20s (transform 349ms, setup 0ms, import 747ms, tests 557ms, environment 2.59s)

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

## Hub API build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api build`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
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

## Web Console build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console build`

- Result: PASS

```text

> @sartre/web-console@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/web-console
> tsc -p tsconfig.json --noEmit && vite build

vite v7.3.5 building client environment for production...
transforming...
✓ 110 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.74 kB │ gzip:  0.47 kB
dist/assets/index-CpkkW5Kt.css   16.07 kB │ gzip:  3.21 kB
dist/assets/index-C4uTDLMI.js   276.18 kB │ gzip: 82.82 kB
✓ built in 918ms
```

## V0.2 scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:v0.2`

- Result: PASS

```text

> sartre@0.1.0 lint:v0.2 /Users/xy/personal/Sartre(agent-workspace-design)
> biome check package.json apps/hub-api apps/connector-cli apps/web-console packages/domain packages/contracts packages/sdk scripts/architecture-check.ts scripts/postgres17-dev.sh

Checked 53 files in 58ms. No fixes applied.
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

## Secret scan

- Evidence: `REAL_TEST`
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

- Result: PASS

```text
scripts/harness-regression.sh:205:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' README.md plan spec reports apps packages scripts package.json --exclude=.env --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:245:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/connector-cli apps/hub-api/src/scripts/local-connector-demo.ts packages/contracts packages/sdk openspec/changes/local-connector-mvp bdd/features/local-connector-mvp.md acceptance/checklists/local-connector-mvp.md plan/local-connector-mvp-goal.md reports/local-connector-mvp scripts/harness-regression.sh package.json pnpm-lock.yaml --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:273:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console apps/connector-cli openspec/changes/web-console-connector-onboarding bdd/features/web-console-connector-onboarding.md acceptance/checklists/web-console-connector-onboarding.md plan/web-console-connector-onboarding-goal.md reports/web-console-connector-onboarding scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:297:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-control-surface bdd/features/web-console-control-surface.md acceptance/checklists/web-console-control-surface.md reports/web-console-control-surface scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:319:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-vercel-geist-alignment bdd/features/web-console-vercel-geist-alignment.md acceptance/checklists/web-console-vercel-geist-alignment.md reports/web-console-vercel-geist-alignment scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:353:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/contracts packages/sdk openspec/changes/web-console-hub-backed-overview bdd/features/web-console-hub-backed-overview.md acceptance/checklists/web-console-hub-backed-overview.md plan/web-console-hub-backed-overview-goal.md reports/web-console-hub-backed-overview scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:391:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Event store and delivery state scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk scripts/harness-regression.sh openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state/checkpoints`

- Result: PASS

```text
```

## Full repo historical lint/build/diff gate

- Evidence: `STRUCTURAL_CHECK`
- Result: SKIP
- Reason: not part of event-store-and-delivery-state scoped gate; known historical blockers remain outside this goal.

## Summary

- Failures: 0
