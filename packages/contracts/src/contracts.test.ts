import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as contracts from "./index.js";
import type { DiagnosticStageRecord } from "./diagnostic-timeline.js";
import { DiagnosticContextSchema } from "./diagnostics.js";
import { ERROR_CODES, ErrorCodeSchema } from "./error-catalog.js";
import { EvidenceManifestSchema } from "./evidence.js";
import { HealthSnapshotSchema } from "./health.js";
import { createResultSchema } from "./result.js";

const SHA_1 = "1".repeat(40);
const SHA_256 = "2".repeat(64);
const STARTED_AT = "2026-07-19T10:00:00.000Z";
const FINISHED_AT = "2026-07-19T10:00:01.000Z";

function validDiagnosticContext() {
  return {
    requestId: randomUUID(),
    correlationId: randomUUID(),
    causationId: randomUUID(),
    workspaceId: null,
    userId: null,
    initiatedByUserId: null,
    actorType: "system",
    actorId: "ms0-self-test",
    component: "hub-api",
    operation: "health.read",
    stage: "dependency_check",
    status: "failed",
    resourceType: null,
    resourceId: null,
    requirementId: null,
    sessionId: null,
    executionId: null,
    leaseId: null,
    endpointId: null,
    occurredAt: STARTED_AT,
    errorCode: "dependency_unavailable",
    retryable: true,
  } as const;
}

function validEvidenceManifest() {
  return {
    schemaVersion: "1",
    commitSha: SHA_1,
    subjectTreeHash: SHA_1,
    dirtyWorktreeHash: SHA_256,
    releaseVersion: "0.1.0",
    imageDigest: null,
    electronArtifactHash: null,
    environmentId: "local-ms0",
    toolVersions: {
      node: "24.11.0",
      pnpm: "10.33.2",
    },
    evidenceLevel: "REAL_TEST",
    status: "PASS",
    startedAt: STARTED_AT,
    finishedAt: FINISHED_AT,
    commands: [
      {
        argv: ["pnpm", "exec", "vitest", "run", "contracts.test.ts"],
        exitCode: 0,
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
        assertions: [
          {
            name: "invalid contract is rejected",
            status: "passed",
          },
        ],
      },
    ],
  } as const;
}

describe("Result contract", () => {
  const ResultSchema = createResultSchema(z.string());

  it("parses the exact success shape", () => {
    expect(ResultSchema.parse({ success: true, data: "ready" })).toEqual({
      success: true,
      data: "ready",
    });
  });

  it("parses the exact failure shape with optional details", () => {
    expect(
      ResultSchema.parse({
        success: false,
        error: {
          code: "dependency_unavailable",
          message: "PostgreSQL unavailable",
          details: { dependency: "postgresql" },
        },
      }),
    ).toEqual({
      success: false,
      error: {
        code: "dependency_unavailable",
        message: "PostgreSQL unavailable",
        details: { dependency: "postgresql" },
      },
    });
  });

  it("rejects a free-form error code", () => {
    expect(() =>
      ResultSchema.parse({
        success: false,
        error: { code: "please_retry_this_message", message: "Retry later" },
      }),
    ).toThrow();
  });

  it("rejects fields outside the authoritative union", () => {
    expect(() =>
      ResultSchema.parse({ success: true, data: "ready", message: "duplicate channel" }),
    ).toThrow();
    expect(() =>
      ResultSchema.parse({
        success: false,
        error: { code: "forbidden", message: "Denied", retryable: false },
      }),
    ).toThrow();
  });
});

describe("DiagnosticContext contract", () => {
  it("parses every field in ModuleContractSpec 3.1", () => {
    const context = validDiagnosticContext();

    expect(DiagnosticContextSchema.parse(context)).toEqual(context);
  });

  it.each([
    "requestId",
    "correlationId",
    "causationId",
    "workspaceId",
    "userId",
    "initiatedByUserId",
    "actorType",
    "actorId",
    "component",
    "operation",
    "stage",
    "status",
    "resourceType",
    "resourceId",
    "requirementId",
    "sessionId",
    "executionId",
    "leaseId",
    "endpointId",
    "occurredAt",
    "errorCode",
    "retryable",
  ] as const)("rejects a missing required %s field", (field) => {
    const input: Record<string, unknown> = { ...validDiagnosticContext() };
    delete input[field];

    expect(() => DiagnosticContextSchema.parse(input)).toThrow();
  });

  it("requires stable UUIDs and timestamps", () => {
    expect(() =>
      DiagnosticContextSchema.parse({
        ...validDiagnosticContext(),
        correlationId: "request-seven",
      }),
    ).toThrow();
    expect(() =>
      DiagnosticContextSchema.parse({
        ...validDiagnosticContext(),
        occurredAt: "last Tuesday",
      }),
    ).toThrow();
  });

  it("requires nullable identifiers to be present even when not applicable", () => {
    const input: Record<string, unknown> = { ...validDiagnosticContext() };
    delete input.sessionId;

    expect(() => DiagnosticContextSchema.parse(input)).toThrow();
  });

  it("rejects free-form status and error codes", () => {
    expect(() =>
      DiagnosticContextSchema.parse({ ...validDiagnosticContext(), status: "looks okay" }),
    ).toThrow();
    expect(() =>
      DiagnosticContextSchema.parse({ ...validDiagnosticContext(), errorCode: "database said no" }),
    ).toThrow();
  });

  it.each(["secret", "localPath", "rawOutput"] as const)(
    "rejects prohibited diagnostic field %s",
    (field) => {
      expect(() =>
        DiagnosticContextSchema.parse({ ...validDiagnosticContext(), [field]: "sensitive" }),
      ).toThrow();
    },
  );
});

describe("HealthSnapshot contract", () => {
  const snapshot = {
    service: "hub-api",
    status: "degraded",
    version: "0.1.0",
    commitSha: SHA_1,
    checkedAt: STARTED_AT,
    dependencies: [
      {
        service: "postgresql",
        status: "unavailable",
        checkedAt: STARTED_AT,
        errorCode: "dependency_unavailable",
      },
    ],
    errorCode: "degraded",
  } as const;

  it("parses service and dependency health using controlled statuses", () => {
    expect(HealthSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it("rejects an invalid timestamp or commit SHA", () => {
    expect(() => HealthSnapshotSchema.parse({ ...snapshot, checkedAt: "now" })).toThrow();
    expect(() => HealthSnapshotSchema.parse({ ...snapshot, commitSha: "main" })).toThrow();
  });

  it("rejects raw Secret and local path fields", () => {
    expect(() => HealthSnapshotSchema.parse({ ...snapshot, secret: "do-not-store" })).toThrow();
    expect(() =>
      HealthSnapshotSchema.parse({ ...snapshot, localPath: "/private/service" }),
    ).toThrow();
    expect(() =>
      HealthSnapshotSchema.parse({
        ...snapshot,
        dependencies: [{ ...snapshot.dependencies[0], rawOutput: "connection details" }],
      }),
    ).toThrow();
  });
});

describe("EvidenceManifest contract", () => {
  it("keeps evidence level separate from result status", () => {
    expect(EvidenceManifestSchema.parse(validEvidenceManifest())).toEqual(validEvidenceManifest());
    expect(
      EvidenceManifestSchema.parse({
        ...validEvidenceManifest(),
        evidenceLevel: "STRUCTURAL_CHECK",
      }).evidenceLevel,
    ).toBe("STRUCTURAL_CHECK");
  });

  it("rejects evidence level values placed in status", () => {
    expect(() =>
      EvidenceManifestSchema.parse({ ...validEvidenceManifest(), status: "REAL_TEST" }),
    ).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({ ...validEvidenceManifest(), status: "STRUCTURAL_CHECK" }),
    ).toThrow();
  });

  it("rejects REAL_TEST mislabeled as SKIPPED or without executed assertions", () => {
    expect(() =>
      EvidenceManifestSchema.parse({ ...validEvidenceManifest(), status: "SKIPPED" }),
    ).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({ ...validEvidenceManifest(), commands: [] }),
    ).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({
        ...validEvidenceManifest(),
        commands: [{ ...validEvidenceManifest().commands[0], assertions: [] }],
      }),
    ).toThrow();
  });

  it("requires well-formed commit, artifact, environment, time, and command metadata", () => {
    expect(() =>
      EvidenceManifestSchema.parse({ ...validEvidenceManifest(), commitSha: "HEAD" }),
    ).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({ ...validEvidenceManifest(), startedAt: "today" }),
    ).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({
        ...validEvidenceManifest(),
        imageDigest: `sha512:${SHA_256}`,
      }),
    ).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({
        ...validEvidenceManifest(),
        commands: [{ ...validEvidenceManifest().commands[0], exitCode: 1 }],
      }),
    ).toThrow();
  });

  it.each(["secret", "localPath", "rawOutput", "stdout", "stderr"] as const)(
    "rejects prohibited evidence field %s",
    (field) => {
      expect(() =>
        EvidenceManifestSchema.parse({ ...validEvidenceManifest(), [field]: "sensitive" }),
      ).toThrow();
    },
  );

  it("requires workflow-authoritative commitSha and rejects the old subject field", () => {
    const missingCommit: Record<string, unknown> = { ...validEvidenceManifest() };
    delete missingCommit.commitSha;

    expect(() => EvidenceManifestSchema.parse(missingCommit)).toThrow();
    expect(() =>
      EvidenceManifestSchema.parse({
        ...validEvidenceManifest(),
        subjectCommitSha: SHA_1,
      }),
    ).toThrow();
  });
});

describe("MS0 stable ErrorCode inventory", () => {
  const requiredMs0Codes = [
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

  it.each(requiredMs0Codes)("includes approved MS0 code %s", (code) => {
    expect(ERROR_CODES).toContain(code);
    expect(ErrorCodeSchema.parse(code)).toBe(code);
  });
});

describe("MS0 DiagnosticTimeline contract", () => {
  const diagnosticContracts = contracts as typeof contracts & {
    DIAGNOSTIC_RECOVERY_ACTIONS?: readonly string[];
    DIAGNOSTIC_STAGES?: readonly string[];
    DiagnosticProbeRequestSchema?: z.ZodType;
    DiagnosticTimelineSchema?: z.ZodType;
  };

  it("uses finite stage and recovery catalogs with an exact probe DTO", () => {
    expect(diagnosticContracts.DIAGNOSTIC_STAGES).toEqual([
      "request_received",
      "context_validated",
      "dependency_check",
      "probe_completed",
    ]);
    expect(diagnosticContracts.DIAGNOSTIC_RECOVERY_ACTIONS).toEqual([
      "none",
      "restore_dependency_and_retry",
    ]);
    expect(diagnosticContracts.DiagnosticProbeRequestSchema).toBeDefined();

    const userId = randomUUID();
    const request = {
      context: {
        ...validDiagnosticContext(),
        userId,
        initiatedByUserId: userId,
        actorId: "ms0-diagnostic-self-test",
        operation: "diagnostics.probe",
        stage: "request_received",
        status: "started",
        errorCode: null,
        retryable: false,
      },
      dependencyOutcome: "healthy",
    } as const;

    expect(diagnosticContracts.DiagnosticProbeRequestSchema?.parse(request)).toEqual(request);
    expect(() =>
      diagnosticContracts.DiagnosticProbeRequestSchema?.parse({
        ...request,
        messageBody: "not-allowed",
      }),
    ).toThrow();
    expect(() =>
      diagnosticContracts.DiagnosticProbeRequestSchema?.parse({
        ...request,
        context: { ...request.context, initiatedByUserId: randomUUID() },
      }),
    ).toThrow();
  });

  it("requires ordered retained stage records and rejects unsafe passthrough fields", () => {
    expect(diagnosticContracts.DiagnosticTimelineSchema).toBeDefined();
    const userId = randomUUID();
    const correlationId = randomUUID();
    const occurredAt = "2026-07-21T10:00:00.000Z";
    const context = {
      ...validDiagnosticContext(),
      correlationId,
      userId,
      initiatedByUserId: userId,
      operation: "diagnostics.probe",
      stage: "request_received",
      status: "succeeded",
      occurredAt,
      errorCode: null,
      retryable: false,
    } as const;
    const stages = [
      "request_received",
      "context_validated",
      "dependency_check",
      "probe_completed",
    ] as const;
    const timelineItems: DiagnosticStageRecord[] = stages.map((stage, index) => {
      const itemOccurredAt = new Date(Date.parse(occurredAt) + index * 2).toISOString();
      const itemRecordedAt = new Date(Date.parse(itemOccurredAt) + 1).toISOString();
      return {
        recordId: randomUUID(),
        sequence: index + 1,
        context: { ...context, stage, occurredAt: itemOccurredAt },
        recordedAt: itemRecordedAt,
        retentionExpiresAt: new Date(
          Date.parse(itemRecordedAt) + 24 * 60 * 60 * 1_000,
        ).toISOString(),
      };
    });
    const timeline = {
      correlationId,
      timelineItems,
      lastSuccessfulStage: "probe_completed",
      firstFailedStage: null,
      currentState: "completed",
      suggestedRecoveryAction: "none",
      evidenceRefs: [],
      correlationIds: [correlationId],
    } as const;

    expect(diagnosticContracts.DiagnosticTimelineSchema?.parse(timeline)).toEqual(timeline);
    expect(() =>
      diagnosticContracts.DiagnosticTimelineSchema?.parse({
        ...timeline,
        timelineItems: [
          {
            ...timelineItems[0],
            retentionExpiresAt: "2026-07-21T09:00:00.000Z",
          },
          ...timelineItems.slice(1),
        ],
      }),
    ).toThrow();

    const replaceContext = (
      index: number,
      replacement: Partial<DiagnosticStageRecord["context"]>,
    ): DiagnosticStageRecord[] =>
      timelineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, context: { ...item.context, ...replacement } } : item,
      );
    const differentUserId = randomUUID();
    const mixedChainItems: readonly (readonly [string, DiagnosticStageRecord[]])[] = [
      ["requestId", replaceContext(1, { requestId: randomUUID() })],
      ["causationId", replaceContext(1, { causationId: randomUUID() })],
      ["workspaceId", replaceContext(1, { workspaceId: randomUUID() })],
      [
        "user chain",
        replaceContext(1, {
          userId: differentUserId,
          initiatedByUserId: differentUserId,
        }),
      ],
      ["actorType", replaceContext(1, { actorType: "human" })],
      ["actorId", replaceContext(1, { actorId: "different-actor" })],
      ["component", replaceContext(1, { component: "local-runtime" })],
      ["operation", replaceContext(1, { operation: "diagnostics.other" })],
      ["resourceType", replaceContext(1, { resourceType: "project" })],
      ["resourceId", replaceContext(1, { resourceId: randomUUID() })],
      ["requirementId", replaceContext(1, { requirementId: randomUUID() })],
      ["sessionId", replaceContext(1, { sessionId: randomUUID() })],
      ["executionId", replaceContext(1, { executionId: randomUUID() })],
      ["leaseId", replaceContext(1, { leaseId: randomUUID() })],
      ["endpointId", replaceContext(1, { endpointId: randomUUID() })],
    ];
    const mixedChainAcceptance = mixedChainItems
      .filter(
        ([, items]) =>
          diagnosticContracts.DiagnosticTimelineSchema?.safeParse({
            ...timeline,
            timelineItems: items,
          }).success,
      )
      .map(([label]) => label);
    const reverseOccurredAt = replaceContext(1, {
      occurredAt: "2026-07-21T09:59:59.999Z",
    });
    const reverseRecordedAt = timelineItems.map((item, index) =>
      index === 0 ? { ...item, recordedAt: "2026-07-21T10:00:00.005Z" } : item,
    );
    const recordedBeforeOccurredAt = timelineItems.map((item, index) =>
      index === 1 ? { ...item, recordedAt: "2026-07-21T10:00:00.001Z" } : item,
    );
    const invalidClockAcceptance = [
      ["reverse occurredAt", reverseOccurredAt],
      ["reverse recordedAt", reverseRecordedAt],
      ["recordedAt before occurredAt", recordedBeforeOccurredAt],
    ]
      .filter(
        ([, items]) =>
          diagnosticContracts.DiagnosticTimelineSchema?.safeParse({
            ...timeline,
            timelineItems: items,
          }).success,
      )
      .map(([label]) => label);
    expect(
      { mixedChainAcceptance, invalidClockAcceptance },
      "mixed DiagnosticContext chain fields and invalid clock order must be rejected",
    ).toEqual({ mixedChainAcceptance: [], invalidClockAcceptance: [] });
    expect(() =>
      diagnosticContracts.DiagnosticTimelineSchema?.parse({
        ...timeline,
        rawOutput: "not-allowed",
      }),
    ).toThrow();

    const summarized = (items: readonly DiagnosticStageRecord[]) => {
      const failed = items.find((item) => item.context.status === "failed");
      const lastSuccessful = items.filter((item) => item.context.status === "succeeded").at(-1);
      return {
        ...timeline,
        timelineItems: items,
        lastSuccessfulStage: lastSuccessful?.context.stage ?? null,
        firstFailedStage: failed?.context.stage ?? null,
        currentState: failed ? "failed" : "completed",
        suggestedRecoveryAction: failed ? "restore_dependency_and_retry" : "none",
      };
    };
    const resequence = (items: readonly DiagnosticStageRecord[]): DiagnosticStageRecord[] =>
      items.map((item, index) => ({ ...item, sequence: index + 1 }));
    const recordAt = (index: number): DiagnosticStageRecord => {
      const record = timelineItems[index];
      if (!record) throw new Error("diagnostic_test_record_missing");
      return record;
    };
    const failedAt = (index: number): DiagnosticStageRecord => ({
      ...recordAt(index),
      context: {
        ...recordAt(index).context,
        status: "failed" as const,
        errorCode: "dependency_unavailable" as const,
        retryable: true,
      },
    });

    for (const [label, corrupt] of [
      ["single request_received", resequence(timelineItems.slice(0, 1))],
      ["stage gap", resequence([recordAt(0), recordAt(2)])],
      ["out of order", resequence([recordAt(1), recordAt(0)])],
      ["successful prefix", resequence(timelineItems.slice(0, 3))],
      ["multiple failures", resequence([recordAt(0), failedAt(1), failedAt(2)])],
      ["records after failure", resequence([recordAt(0), failedAt(1), recordAt(2)])],
    ] as const) {
      expect(
        () => diagnosticContracts.DiagnosticTimelineSchema?.parse(summarized(corrupt)),
        `expected ${label} to be rejected`,
      ).toThrow();
    }
  });
});
