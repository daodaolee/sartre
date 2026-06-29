## 1. G1 Contract Foundation

- [x] 1.1 Add failing contract tests for `CapabilitySource`, `ExecutorBinding`, `ApprovalPolicy`, and endpoint manifest defaults.
- [x] 1.2 Implement shared contract schemas and exported types in `packages/contracts`.
- [x] 1.3 Update SDK tests and parsing so endpoint registration and overview round-trip manifest fields.

## 2. G2 Hub Persistence

- [x] 2.1 Add failing Hub API e2e coverage for endpoint manifest persistence and legacy defaults.
- [x] 2.2 Add additive Postgres migration columns for `capability_sources`, `executor`, and `approval_policy`.
- [x] 2.3 Update repository ports and Postgres mapping to persist and expose endpoint manifests.

## 3. G3 Local Connector

- [x] 3.1 Add failing connector-core tests for profile capability source declarations.
- [x] 3.2 Update connector profiles and registration payloads to include capability sources, executor, and approval policy.
- [x] 3.3 Add inbox markdown and health report coverage for declared capability sources.

## 4. G4 Web Console Projection

- [x] 4.1 Add failing Web Console tests that Agents, Hooks, and Skills surfaces use overview manifest data.
- [x] 4.2 Update Web Console mapping to render capability sources by current selected endpoint.
- [x] 4.3 Keep static local demo fallback only when Hub overview has no manifest data.

## 5. G5 Verification

- [x] 5.1 Run contracts, SDK, connector-core, hub-api, and web-console tests.
- [x] 5.2 Run Web Console build, architecture check, OpenSpec strict validation, and `git diff --check`.
- [x] 5.3 Record remaining limitations and next-goal candidates for Codex CLI executor and platform chat runtime.
