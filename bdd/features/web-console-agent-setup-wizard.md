# Feature: Web Console agent setup wizard

## Scenario: Selected actor sees a guided setup path

Given endpoint diagnostics are available for the selected actor
When the user opens the setup panel
Then the wizard shows role, executor, capabilities, permission, health, and trial run steps
And the user is not asked to edit JSON

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test` and `CHANGE_NAME=web-console-agent-setup-wizard pnpm harness:regression`.

## Scenario: Setup actions reuse existing operations

Given the selected actor is QA
When the user follows setup actions
Then the page can register the endpoint, connect the endpoint, and create a trial handoff through existing Web operations

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test` and `CHANGE_NAME=web-console-agent-setup-wizard pnpm harness:regression`.
