import type { EvidenceLevel } from "../../packages/contracts/src/evidence.js";
import {
  EvidenceLevelSchema,
  EvidenceManifestSchema,
} from "../../packages/contracts/src/evidence.js";

type TargetKind = "test" | "build" | "service" | "command";
type ServiceStatus = "healthy" | "degraded" | "unreachable" | null;

interface EvidenceEnvelope {
  manifest: unknown;
  declaration: {
    gateId: string;
    required: boolean;
    evidenceLevel: EvidenceLevel;
    targetKind: TargetKind;
    requiresArtifactHash: boolean;
  };
  observation: {
    actualDirtyWorktreeHash: string;
    evidenceCommitSha: string | null;
    targetExecuted: boolean;
    failureModeVerified: boolean;
    serviceStatus: ServiceStatus;
    artifactHashes: string[];
  };
}

export interface EvidenceValidationIssue {
  code: string;
  message: string;
}

export interface EvidenceValidationResult {
  valid: boolean;
  issues: EvidenceValidationIssue[];
}

function issue(code: string, message: string): EvidenceValidationIssue {
  return { code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function parseEnvelope(input: unknown): EvidenceEnvelope | null {
  if (!isRecord(input) || !hasExactKeys(input, ["manifest", "declaration", "observation"])) {
    return null;
  }
  const declaration = input.declaration;
  const observation = input.observation;
  if (
    !isRecord(declaration) ||
    !hasExactKeys(declaration, [
      "gateId",
      "required",
      "evidenceLevel",
      "targetKind",
      "requiresArtifactHash",
    ]) ||
    typeof declaration.gateId !== "string" ||
    declaration.gateId.length === 0 ||
    typeof declaration.required !== "boolean" ||
    !EvidenceLevelSchema.safeParse(declaration.evidenceLevel).success ||
    !["test", "build", "service", "command"].includes(String(declaration.targetKind)) ||
    typeof declaration.requiresArtifactHash !== "boolean" ||
    !isRecord(observation) ||
    !hasExactKeys(observation, [
      "actualDirtyWorktreeHash",
      "evidenceCommitSha",
      "targetExecuted",
      "failureModeVerified",
      "serviceStatus",
      "artifactHashes",
    ]) ||
    typeof observation.actualDirtyWorktreeHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(observation.actualDirtyWorktreeHash) ||
    !(
      observation.evidenceCommitSha === null ||
      (typeof observation.evidenceCommitSha === "string" &&
        /^[0-9a-f]{40}$/.test(observation.evidenceCommitSha))
    ) ||
    typeof observation.targetExecuted !== "boolean" ||
    typeof observation.failureModeVerified !== "boolean" ||
    ![null, "healthy", "degraded", "unreachable"].includes(
      observation.serviceStatus as ServiceStatus,
    ) ||
    !Array.isArray(observation.artifactHashes) ||
    !observation.artifactHashes.every(
      (hash) => typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash),
    )
  ) {
    return null;
  }
  return input as unknown as EvidenceEnvelope;
}

export function validateEvidenceRecord(input: unknown): EvidenceValidationResult {
  const envelope = parseEnvelope(input);
  if (envelope === null) {
    return {
      valid: false,
      issues: [issue("evidence_record_invalid", "Evidence declaration or observation is invalid")],
    };
  }

  const parsedManifest = EvidenceManifestSchema.safeParse(envelope.manifest);
  if (!parsedManifest.success) {
    return {
      valid: false,
      issues: [issue("evidence_schema_invalid", "Evidence manifest does not match its schema")],
    };
  }

  const { declaration, observation } = envelope;
  const manifest = parsedManifest.data;
  const issues: EvidenceValidationIssue[] = [];

  if (
    declaration.required &&
    (manifest.evidenceLevel === "SKIPPED" || manifest.status === "SKIPPED")
  ) {
    issues.push(issue("required_gate_skipped", "A required gate cannot be skipped"));
  }

  if (manifest.evidenceLevel !== declaration.evidenceLevel) {
    issues.push(
      issue(
        "evidence_level_mismatch",
        `Declared ${declaration.evidenceLevel} evidence was reported as ${manifest.evidenceLevel}`,
      ),
    );
  }

  if (manifest.dirtyWorktreeHash !== observation.actualDirtyWorktreeHash) {
    issues.push(
      issue("dirty_worktree_hash_mismatch", "Reported and observed dirty worktree hashes differ"),
    );
  }

  if (manifest.status === "PASS" && declaration.targetKind === "service") {
    if (observation.serviceStatus === "unreachable") {
      issues.push(issue("service_unreachable_pass", "An unreachable service cannot be PASS"));
    }
    if (observation.serviceStatus === "degraded") {
      issues.push(issue("service_degraded_pass", "A degraded service cannot be PASS"));
    }
  }

  if (
    manifest.status === "PASS" &&
    declaration.targetKind === "build" &&
    declaration.requiresArtifactHash &&
    observation.artifactHashes.length === 0
  ) {
    issues.push(
      issue("artifact_hash_missing", "A successful required build needs an artifact hash"),
    );
  }

  if (manifest.evidenceLevel === "REAL_TEST") {
    if (!observation.targetExecuted) {
      issues.push(issue("target_not_executed", "REAL_TEST requires an executed target"));
    }
    if (!observation.failureModeVerified) {
      issues.push(
        issue("failure_mode_unverified", "REAL_TEST requires a verified non-zero failure mode"),
      );
    }
  }

  if (
    observation.evidenceCommitSha !== null &&
    observation.evidenceCommitSha === manifest.commitSha
  ) {
    issues.push(
      issue(
        "evidence_commit_self_reference",
        "The evidence commit cannot identify itself as the tested subject",
      ),
    );
  }

  return { valid: issues.length === 0, issues };
}
