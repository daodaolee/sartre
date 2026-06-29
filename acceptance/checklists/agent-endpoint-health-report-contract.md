# Acceptance Checklist: Agent Endpoint Health Report Contract

- [x] Health report request/response schemas are versioned and exported.
- [x] Hub rejects unknown endpoints and tenant mismatch with classified errors.
- [x] Hub persists latest health report and projects it into overview.
- [x] SDK exposes a health submission method.
- [x] Web Console consumes health report data without making it a delivery state.
- [x] Tests/build/lint/architecture checks are covered by lane-a regression.
