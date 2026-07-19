import { z } from "zod";

const GitObjectHashSchema = z.string().regex(/^[0-9a-f]{40}$/);
const Sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const ImageDigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const StableValueSchema = z.string().min(1).max(256);

export const EvidenceLevelSchema = z.enum([
  "REAL_TEST",
  "STRUCTURAL_CHECK",
  "SCENARIO_REGISTERED",
  "SKIPPED",
  "MANUAL_REQUIRED",
]);

export const EvidenceStatusSchema = z.enum(["PASS", "FAIL", "BLOCKED", "SKIPPED"]);

export const EvidenceAssertionSchema = z
  .object({
    name: z.string().min(1).max(256),
    status: z.enum(["passed", "failed"]),
  })
  .strict();

export const EvidenceCommandSchema = z
  .object({
    argv: z.array(z.string().min(1)).min(1),
    exitCode: z.number().int(),
    startedAt: z.iso.datetime({ offset: true }),
    finishedAt: z.iso.datetime({ offset: true }),
    assertions: z.array(EvidenceAssertionSchema),
  })
  .strict()
  .refine((command) => Date.parse(command.finishedAt) >= Date.parse(command.startedAt), {
    message: "finishedAt must not precede startedAt",
    path: ["finishedAt"],
  });

export const EvidenceManifestSchema = z
  .object({
    schemaVersion: StableValueSchema,
    commitSha: GitObjectHashSchema,
    subjectTreeHash: GitObjectHashSchema,
    dirtyWorktreeHash: Sha256Schema,
    releaseVersion: StableValueSchema,
    imageDigest: ImageDigestSchema.nullable(),
    electronArtifactHash: Sha256Schema.nullable(),
    environmentId: StableValueSchema,
    toolVersions: z
      .record(StableValueSchema, StableValueSchema)
      .refine((versions) => Object.keys(versions).length > 0, "toolVersions must not be empty"),
    evidenceLevel: EvidenceLevelSchema,
    status: EvidenceStatusSchema,
    startedAt: z.iso.datetime({ offset: true }),
    finishedAt: z.iso.datetime({ offset: true }),
    commands: z.array(EvidenceCommandSchema),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (Date.parse(manifest.finishedAt) < Date.parse(manifest.startedAt)) {
      context.addIssue({
        code: "custom",
        message: "finishedAt must not precede startedAt",
        path: ["finishedAt"],
      });
    }

    if (manifest.evidenceLevel === "SKIPPED" && manifest.status !== "SKIPPED") {
      context.addIssue({
        code: "custom",
        message: "SKIPPED evidence must have SKIPPED status",
        path: ["status"],
      });
    }

    if (manifest.status === "SKIPPED" && manifest.evidenceLevel !== "SKIPPED") {
      context.addIssue({
        code: "custom",
        message: "SKIPPED status requires SKIPPED evidence level",
        path: ["evidenceLevel"],
      });
    }

    if (manifest.evidenceLevel === "SCENARIO_REGISTERED" && manifest.status === "PASS") {
      context.addIssue({
        code: "custom",
        message: "a registered scenario is not PASS evidence",
        path: ["status"],
      });
    }

    if (
      (manifest.evidenceLevel === "REAL_TEST" || manifest.evidenceLevel === "STRUCTURAL_CHECK") &&
      manifest.commands.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message: "executed evidence requires command metadata",
        path: ["commands"],
      });
    }

    if (
      manifest.evidenceLevel === "REAL_TEST" &&
      manifest.commands.some((command) => command.assertions.length === 0)
    ) {
      context.addIssue({
        code: "custom",
        message: "REAL_TEST commands require assertions",
        path: ["commands"],
      });
    }

    if (
      manifest.status === "PASS" &&
      manifest.commands.some(
        (command) =>
          command.exitCode !== 0 ||
          command.assertions.some((assertion) => assertion.status !== "passed"),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "PASS evidence cannot contain a failed command or assertion",
        path: ["commands"],
      });
    }
  });

export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;
export type EvidenceAssertion = z.infer<typeof EvidenceAssertionSchema>;
export type EvidenceCommand = z.infer<typeof EvidenceCommandSchema>;
export type EvidenceManifest = z.infer<typeof EvidenceManifestSchema>;
