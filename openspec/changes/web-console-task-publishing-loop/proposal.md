# Proposal: Web Console Task Publishing Loop

## Why

The current Web Console can read Handoff Hub overview data and run basic delivery commands, but it still behaves like a demo console. The first usable collaboration loop needs a task publishing entry, a target Agent selector, a recipient-side execution gate, and a result-send step that are backed by contracts and Hub state.

## What Changes

- Reduce the inbox board to `已发送 / 已接收 / 已结束`.
- Remove the Hub connection pill from the workspace bar; endpoint status is represented by the endpoint dot.
- Add a secondary task creation page with title, description, ordered attachments, object-storage profile metadata, and target role/Agent selection.
- Extend delivery lifecycle commands for human release, report-ready, and final send-back.
- Keep handoff pack payloads free-form; do not force repo/branch/commit_range fields.
- Keep object storage secrets out of frontend, tests, docs, and repository files.

## Impact

- Affected code:
  - `packages/domain/**`
  - `packages/contracts/**`
  - `packages/sdk/**`
  - `apps/hub-api/**`
  - `apps/web-console/**`
- No hardcoded COS secret values.
- No direct Web Console dependency on Hub API internals.
- No publish, push, reset, revert, or workspace cleanup.
