# Regression Report: web-console-agent-setup-wizard

- Timestamp: 20260623T111847Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK

## OpenSpec Web Console agent setup wizard

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate web-console-agent-setup-wizard --type change --strict --no-interactive`

- Result: PASS

```text
Change 'web-console-agent-setup-wizard' is valid
```

## BDD acceptance and ledger files

- Evidence: `STRUCTURAL_CHECK`
- Command: `bash -lc test -f bdd/features/web-console-agent-setup-wizard.md && test -f acceptance/checklists/web-console-agent-setup-wizard.md && test -f reports/web-console-agent-setup-wizard/checkpoints/PLAN_LEDGER.md`

- Result: PASS

```text
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
      Tests  27 passed (27)
   Start at  19:18:50
   Duration  2.03s (transform 302ms, setup 0ms, import 679ms, tests 825ms, environment 728ms)

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
dist/assets/index-CtrW3j9t.js   293.97 kB │ gzip: 87.02 kB
✓ built in 811ms
```

## V0.2 scoped lint

- Evidence: `REAL_TEST`
- Command: `pnpm run lint:lane-a`

- Result: PASS

```text

> sartre@0.1.0 lint:lane-a /Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline
> biome check package.json apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core scripts/architecture-check.ts scripts/architecture-check.test.ts scripts/evidence-gate.ts scripts/evidence-gate.test.ts scripts/web-console-hub-real-smoke.test.ts scripts/postgres17-dev.sh

Checked 68 files in 57ms. No fixes applied.
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

## Secret scan

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
scripts/harness-regression.sh:556:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk openspec/changes/event-store-and-delivery-state bdd/features/event-store-and-delivery-state.md acceptance/checklists/event-store-and-delivery-state.md plan/event-store-and-delivery-state-goal.md reports/event-store-and-delivery-state scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:586:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api packages/contracts packages/sdk openspec/changes/handoff-hub-service-hardening bdd/features/handoff-hub-service-hardening.md acceptance/checklists/handoff-hub-service-hardening.md plan/handoff-hub-service-hardening-goal.md reports/handoff-hub-service-hardening scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:648:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/hub-api apps/web-console packages/domain packages/contracts packages/sdk packages/connector-core openspec/changes/v02-handoff-hub-governance-gate openspec/changes/event-store-and-delivery-state openspec/changes/handoff-hub-service-hardening openspec/changes/monorepo-package-isolation-governance openspec/changes/regression-evidence-gate openspec/changes/web-console-first-version-loop openspec/changes/web-console-hub-real-smoke openspec/changes/web-console-agent-reconnect-control openspec/changes/web-console-endpoint-diagnostics bdd/features/v02-handoff-hub-governance-gate.md bdd/features/event-store-and-delivery-state.md bdd/features/handoff-hub-service-hardening.md bdd/features/monorepo-package-isolation-governance.md bdd/features/regression-evidence-gate.md bdd/features/web-console-first-version-loop.md bdd/features/web-console-hub-real-smoke.md bdd/features/web-console-agent-reconnect-control.md bdd/features/web-console-endpoint-diagnostics.md acceptance/checklists/v02-handoff-hub-governance-gate.md acceptance/checklists/event-store-and-delivery-state.md acceptance/checklists/handoff-hub-service-hardening.md acceptance/checklists/monorepo-package-isolation-governance.md acceptance/checklists/regression-evidence-gate.md acceptance/checklists/web-console-first-version-loop.md acceptance/checklists/web-console-hub-real-smoke.md acceptance/checklists/web-console-agent-reconnect-control.md acceptance/checklists/web-console-endpoint-diagnostics.md plan/web-console-hub-real-smoke-goal.md plan/web-console-agent-reconnect-control-goal.md plan/web-console-endpoint-diagnostics-goal.md reports/v0.2-handoff-hub-governance-gate reports/event-store-and-delivery-state reports/handoff-hub-service-hardening reports/monorepo-package-isolation-governance reports/regression-evidence-gate reports/web-console-first-version-loop reports/web-console-hub-real-smoke reports/web-console-agent-reconnect-control reports/web-console-endpoint-diagnostics scripts/harness-regression.sh scripts/evidence-gate.ts scripts/web-console-hub-real-smoke.test.ts package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
scripts/harness-regression.sh:652:    bash -lc 'matches="$(/usr/bin/grep -RInE '\''DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}'\'' apps/web-console openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard scripts/harness-regression.sh package.json pnpm-lock.yaml biome.json --exclude=latest.md --exclude='\''*-regression-report.md'\'' 2>/dev/null || true)"; printf "%s\n" "$matches"; disallowed="$(printf "%s\n" "$matches" | grep -v "grep -RInE" | grep -v "scripts/harness-regression.sh" || true)"; test -z "$disallowed"'
```

## Web Console agent setup wizard scoped diff check

- Evidence: `REAL_TEST`
- Command: `git diff --check -- apps/web-console scripts/harness-regression.sh openspec/changes/web-console-agent-setup-wizard bdd/features/web-console-agent-setup-wizard.md acceptance/checklists/web-console-agent-setup-wizard.md plan/web-console-agent-setup-wizard-goal.md reports/web-console-agent-setup-wizard/checkpoints`

- Result: PASS

```text
```

## Full repo historical lint/build/diff gate

- Evidence: `STRUCTURAL_CHECK`
- Command: `n/a`
- Result: SKIP
- Reason: not part of Web Console agent setup wizard scoped gate; known historical blockers remain outside this goal.

## Summary

- Failures: 0
