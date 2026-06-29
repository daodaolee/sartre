# Acceptance Checklist: Real handoff execution and failure audit

- [x] OpenSpec proposal/design/spec/tasks exist and validate strictly.
- [x] Connector-core tests prove successful execution path still reaches report ready.
- [x] Connector-core tests prove executor failure after `startDelivery` records failed model run.
- [x] Connector-core tests prove executor failure marks delivery failed through public SDK/Hub API.
- [x] Connector-core tests prove secret-like error messages are redacted before writeback.
- [x] Connector CLI smoke can exercise real handoff execution or honestly report `SKIPPED`/classified failure.
- [x] Web Console either already shows failed model-run facts or has a tested projection-only update.
- [x] Architecture check confirms Connector/Web do not import Hub implementation internals.
- [x] Regression evidence records real commands, exit status, and smoke outcome.
