# Goal: Web Console Endpoint Diagnostics

## Objective

Turn static setup guidance into real endpoint readiness diagnostics derived from Hub overview data.

## Scope

- Add pure Web diagnostics module.
- Add diagnostics tests.
- Render selected actor diagnostics in Web Console.
- Add the change to Lane A regression evidence.

## Non-Goals

- No full setup wizard.
- No new Hub API route.
- No schema migration.
- No packaging boundary change.

## Plan Calibration Rule

After this goal, continue to setup wizard only if diagnostics can be derived from existing overview data. If required health data is missing, create a service-contract goal first.
