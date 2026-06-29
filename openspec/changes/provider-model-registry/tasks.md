## 1. G1 Change Skeleton and Scenarios

- [x] 1.1 Add BDD scenarios and acceptance checklist for provider/model registry, endpoint scope, health, and read-only UI behavior.
- [x] 1.2 Add PLAN_LEDGER checkpoint structure for the provider-model-registry goal.

## 2. G2 Contract and SDK Foundation

- [x] 2.1 Add failing contract tests for provider model profiles, capabilities, health reports, registry list, and selection resolution.
- [x] 2.2 Implement shared contract schemas and exported types in `packages/contracts`.
- [x] 2.3 Add failing SDK tests for registry profile registration, health reporting, list, and resolve helpers.
- [x] 2.4 Implement SDK helper methods in `packages/sdk`.

## 3. G3 Hub API Registry Persistence

- [x] 3.1 Add failing Hub API tests for profile upsert, health report, endpoint-scoped list, and resolve behavior.
- [x] 3.2 Add additive Postgres migration for provider model registry tables.
- [x] 3.3 Implement provider registry repository port, Postgres implementation, application service, and HTTP controller.
- [x] 3.4 Import ProviderRegistryModule in Hub API without changing Handoff or Conversation contracts.

## 4. G4 Web Console Registry Projection

- [x] 4.1 Add failing Web Console tests for current-endpoint registry view, default selection, and no secret/execution controls.
- [x] 4.2 Implement Hub loader and read-only UI mapping for provider/model registry profiles.
- [x] 4.3 Keep API key editing, model execution, composer, and streaming UI out of scope.

## 5. G5 Verification and Closeout

- [x] 5.1 Run contracts, SDK, hub-api, and web-console tests.
- [x] 5.2 Run build, architecture check, OpenSpec strict validation, and `git diff --check`.
- [x] 5.3 Run live Hub/Postgres smoke for profile upsert, health report, endpoint-scoped list, and selection resolve.
- [x] 5.4 Record remaining limitations and next-goal candidates for local Codex executor, provider gateway, streaming UI, and registry-to-model-run linking.
