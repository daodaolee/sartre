# Agent Endpoint Health Report Contract Plan Ledger

## Current Gate

- Active step: final verification
- Last completed checkpoint: implementation and lane-a regression coverage
- Blockers: none
- Changed assumptions: none
- Next step: keep as part of lane-a regression

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | define-health-contract | DONE | - | contracts tests | Schema version `1.0` health request/response |
| 02 | persist-health-in-hub | DONE | 01 | hub-api tests | Latest health report per endpoint |
| 03 | project-health-to-overview | DONE | 02 | hub-api/web tests | Web Console setup/settings use overview facts |
| 04 | include-in-lane-a-regression | DONE | 03 | harness report | Current lane-a gate validates this change |

## Cross-Step Contracts

- Identity: `tenant_id`, `agent_endpoint_id`
- Traits/Contracts: endpoint health request/response schemas
- Config: none
- Data/Storage: latest endpoint health report
- External adapters: Connector submits through SDK
- State machine: none; health does not mutate delivery state
- Diagnostics: overview projection and Web Console settings/setup surfaces

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |
| 2026-06-26 | Health is part of endpoint readiness | No change | all | keep provider-neutral |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced by lane-a harness.
