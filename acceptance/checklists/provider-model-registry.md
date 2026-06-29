# Acceptance Checklist: Provider Model Registry

## Contract

- [x] Contracts expose versioned schemas for provider model profiles, capabilities, health reports, registry list responses, and selection resolution.
- [x] Contracts reject profile/health metadata containing secret-like keys or values.
- [x] Provider session ids, API keys, tokens, and rendered prompts are not part of provider model profile contracts.

## SDK

- [x] SDK can register provider model profiles.
- [x] SDK can report provider model health.
- [x] SDK can list registry profiles for a tenant endpoint.
- [x] SDK can resolve a compatible provider model selection.

## Hub API

- [x] Hub upserts provider model profiles by tenant, endpoint, provider, model, and executor kind.
- [x] Hub records latest health report separately from profile capability declarations.
- [x] Hub list returns only profiles for the requested endpoint.
- [x] Hub resolve returns compatible default/preferred profiles without executing a provider call.
- [x] Hub returns classified unavailable errors when no compatible profile exists.

## Web Console

- [x] Web Console shows current endpoint's provider/model registry profiles.
- [x] Web Console refreshes registry view when endpoint identity changes.
- [x] Web Console shows provider, model, executor kind, capabilities, health, token limits, and default selection.
- [x] Web Console does not show API key controls, provider secret values, chat composer, streaming output, or execute buttons.

## Evidence

- [x] BDD scenarios are registered before implementation.
- [x] Contract, SDK, Hub API, and Web Console tests pass.
- [x] Builds and architecture checks pass.
- [x] OpenSpec strict validation passes.
- [x] Live Hub/Postgres smoke confirms profile upsert, health report, endpoint-scoped list, and selection resolve behavior.
