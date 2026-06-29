## Why

Connector can now submit endpoint health reports, but Web Console still lacks an explicit way for users to refresh the overview after running `connector health <dev|qa>` and the Agent health cards do not summarize reported health state. Users need a clear feedback loop from local Connector submission to page state.

## What Changes

- Add a manual overview refresh affordance in Web Console.
- Show refresh state and failure details without dropping the current overview.
- Summarize reported endpoint health in Agent health cards using existing overview `health_report` facts.
- Add Connector health command guidance to setup commands.
- Keep Web Console consuming Hub overview only; no Hub internals or Connector imports.

## Capabilities

### New Capabilities

- `web-console-health-refresh-affordance`: Web Console lets users refresh Hub overview and interpret reported endpoint health.

### Modified Capabilities

- None.

## Impact

- Affected code:
  - `apps/web-console`
  - `scripts/harness-regression.sh`
- API impact:
  - No API change. Uses existing `HandoffOverviewResponse`.
- UX impact:
  - Users can run local Connector health submission and then refresh Web Console to verify status.
