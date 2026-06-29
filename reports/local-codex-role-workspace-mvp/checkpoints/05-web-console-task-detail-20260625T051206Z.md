# Checkpoint 05: Web Console task detail projection

## Scope

- Selected task detail now loads conversation ledger and provider registry facts.
- Task detail renders a `运行事实` section with:
  - conversation id
  - model run id
  - run status
  - provider/model
  - executor endpoint
  - assistant output excerpt
  - context projection excerpt
- Runtime facts remain task-scoped through `delivery_id` / `handoff_id` metadata and references.
- No `computer` navigation or execution center was added.

## Evidence

- `pnpm --filter @sartre/web-console test -- App.test.tsx`
  - Result: PASS, 4 test files, 28 tests.
- `pnpm --filter @sartre/web-console build`
  - Result: PASS.

## Notes

- The UI consumes Hub facts; it does not invent local-only execution state.
- Reports and runtime facts stay inside task detail.
