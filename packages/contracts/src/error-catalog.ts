import { z } from "zod";

export const ERROR_CODES = [
  "validation_failed",
  "unauthenticated",
  "authentication_failed",
  "refresh_token_reused",
  "endpoint_credential_invalid",
  "identity_recovered",
  "forbidden",
  "project_access_denied",
  "resource_not_found",
  "version_conflict",
  "state_conflict",
  "idempotency_conflict",
  "lease_conflict",
  "agent_definition_changed",
  "agent_model_alias_changed",
  "payload_too_large",
  "invariant_failed",
  "rate_limited",
  "dependency_unavailable",
  "degraded",
  "upgrade_required",
  "no_client_action_observed",
  "root_packaging_prohibited",
  "migration_lock_timeout",
  "secret_boundary_violation",
  "secret_artifact_violation",
  "postgres_version_mismatch",
  "migration_checksum_mismatch",
  "schema_incompatible",
  "artifact_path_missing",
  "legacy_source_drift",
  "process_recovered",
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
