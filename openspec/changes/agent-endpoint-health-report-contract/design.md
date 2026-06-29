## Context

Sartre's local-first role collaboration flow depends on local endpoints. A user should not have to infer readiness from raw registration state or hidden connector logs. Health reports provide a provider-neutral readiness snapshot that Hub can validate and Web Console can display.

## Goals / Non-Goals

**Goals:**

- Define request/response contracts for endpoint health reports.
- Validate tenant/endpoint consistency at Hub boundary.
- Persist the latest report and expose it through overview.
- Keep health check labels, status, details, and timestamps structured.

**Non-Goals:**

- Do not execute real Codex/Claude from Hub.
- Do not turn health into a delivery state.
- Do not add realtime health streaming.
- Do not encode Dev-to-QA-specific payload structure.

## Decisions

### Health is endpoint-scoped, not role-scoped

One role can have multiple local agents. The health report is keyed by `agent_endpoint_id`, so Web Console can show readiness per concrete endpoint.

### Health reports are latest-state projections

Hub stores the latest report for an endpoint. Historical health events can be added later if diagnostics require it; the MVP only needs current setup/readiness.

### Error classification follows module contracts

Tenant mismatch is `InvalidInput`. Missing endpoints are `Unavailable`. The error response never includes secrets.

## Risks / Trade-offs

- [Risk] Latest-state only loses health history. Mitigation: delivery/task audit remains separate; health history can be a later event stream.
- [Risk] Users may confuse health with authorization. Mitigation: Web copy treats it as connection/readiness only.
- [Risk] Provider-specific facts may leak into the generic contract. Mitigation: checks use generic `label/status/detail/metadata`.

## Migration Plan

1. Add contract schemas and tests.
2. Add Hub persistence and controller tests.
3. Add SDK method.
4. Project health into overview and Web Console.
5. Add harness coverage and closeout evidence.
