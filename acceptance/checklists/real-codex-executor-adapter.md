# Acceptance Checklist: Real Codex executor adapter

- [x] OpenSpec proposal/design/spec/tasks exist and validate strictly.
- [x] Connector-core tests prove real Codex CLI command construction without spawning Codex.
- [x] Connector-core tests prove final assistant output capture from the Codex output file.
- [x] Connector-core tests prove timeout, unavailable binary, user-action, rate-limit, invalid-input, and secret redaction behavior.
- [x] Connector CLI tests prove fake executor remains default and real executor is explicit.
- [x] Real smoke attempts an actual Codex process and records `REAL_TEST`, or records `SKIPPED` with a concrete reason.
- [x] `computer` is not introduced as product language, navigation, or public contract in this change.
- [x] Targeted tests/builds, architecture check, OpenSpec validation, and `git diff --check` are recorded in regression evidence.
