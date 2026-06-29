# Regression Report: handoff-hub-service-hardening

- Timestamp: 20260623T082928Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec Handoff Hub service hardening

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate handoff-hub-service-hardening --type change --strict --no-interactive`

- Result: PASS

```text
Change 'handoff-hub-service-hardening' is valid
```

## BDD acceptance and ledger files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/handoff-hub-service-hardening.md && test -f acceptance/checklists/handoff-hub-service-hardening.md && test -f reports/handoff-hub-service-hardening/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
```

## Hub API tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api test`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 test /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> vitest run


 RUN  v4.1.8 /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api


 Test Files  4 passed (4)
      Tests  9 passed (9)
   Start at  16:29:31
   Duration  972ms (transform 438ms, setup 0ms, import 1.07s, tests 273ms, environment 0ms)

```

## Hub API build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/hub-api build`

- Result: PASS

```text

> @sartre/hub-api@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/apps/hub-api
> tsc -p tsconfig.json --noEmit

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
      Tests  6 passed (6)
   Start at  16:29:34
   Duration  236ms (transform 58ms, setup 0ms, import 99ms, tests 13ms, environment 0ms)

```

## Contracts build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/contracts build`

- Result: PASS

```text

> @sartre/contracts@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/packages/contracts
> tsc -p tsconfig.json --noEmit

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
      Tests  8 passed (8)
   Start at  16:29:36
   Duration  362ms (transform 117ms, setup 0ms, import 170ms, tests 27ms, environment 0ms)

```

## SDK build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/sdk build`

- Result: PASS

```text

> @sartre/sdk@0.1.0 build /Users/xy/personal/Sartre(agent-workspace-design)/packages/sdk
> tsc -p tsconfig.json --noEmit

```

## V0.2 scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:v0.2`

- Result: PASS

```text

> sartre@0.1.0 lint:v0.2 /Users/xy/personal/Sartre(agent-workspace-design)
> biome check package.json apps/hub-api apps/connector-cli apps/web-console packages/domain packages/contracts packages/sdk scripts/architecture-check.ts scripts/postgres17-dev.sh

Checked 60 files in 49ms. No fixes applied.
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
- Command: `bash -lc matches="$(/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' apps/hub-api packages/contracts packages/sdk openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='*-regression-report.md' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"`

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
```

## Handoff Hub service hardening scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- apps/hub-api packages/contracts packages/sdk scripts/harness-regression.sh openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening/checkpoints`

- Result: PASS

```text
```

## Full repo historical lint/build/diff gate

- Evidence: `STRUCTURAL_CHECK`
- Result: SKIP
- Reason: not part of handoff-hub-service-hardening scoped gate; known historical blockers remain outside this goal.

## Summary

- Failures: 0
