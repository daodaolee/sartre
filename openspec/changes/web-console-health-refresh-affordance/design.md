## Context

The local health submission loop now spans Connector Core/CLI, SDK, Hub API, and overview projection. Web Console already consumes overview data, but the current UI mostly reflects endpoint registration/connection and setup diagnostics. A user who runs `connector health qa` needs a visible next step in the page: refresh Hub overview and see whether endpoint health is passed, warning, blocked, or missing.

## Goals / Non-Goals

**Goals:**

- Add a user-triggered refresh button that reuses the existing overview loader.
- Preserve current overview content when refresh fails.
- Show a concise Agent health summary derived from endpoint `health_report.checks`.
- Include the `connector health <dev|qa>` command in setup guidance.
- Follow Vercel React best practices: interaction side effects in event handlers and derived health view state during render/model construction.

**Non-Goals:**

- Do not add polling, SSE, or realtime refresh.
- Do not import Hub API internals or Connector Core into Web Console.
- Do not add new SDK methods.
- Do not redesign the page visual system.

## Decisions

### Manual refresh before polling

MVP adds a manual refresh button. Polling can be useful later, but a manual affordance is lower risk and avoids hidden background traffic while the service contract is still evolving.

### Preserve overview on refresh failure

Refresh failures should be visible as a small status message, but the current dashboard should remain usable. Initial load failure still uses the existing error state.

### Summarize health in the view model

Health card state is derived in `toOverviewViewModel` from `health_report`. React components receive simple strings/statuses instead of recalculating report status inside JSX.

## Risks / Trade-offs

- [Risk] Manual refresh requires the user to click after running CLI. Mitigation: command guidance names the health command and the refresh status makes the loop explicit.
- [Risk] Health summary could hide individual check detail. Mitigation: existing Endpoint diagnostics still lists individual reported health checks.
- [Risk] Refresh errors may be missed. Mitigation: refresh status uses `aria-live` and concise visible copy.

## Migration Plan

1. Add failing Web Console tests for refresh behavior and health card summary.
2. Implement refresh state and button in `App`.
3. Extend view model health summary from overview `health_report`.
4. Add harness regression coverage and Lane A gate integration.
5. Run verification and update closeout evidence.
