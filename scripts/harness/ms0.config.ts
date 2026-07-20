import type { HarnessConfig } from "./run-required-gates.js";
import { createRepositorySubjectDeclaration } from "./run-required-gates.js";

const config: HarnessConfig = {
  schemaVersion: "1",
  subject: createRepositorySubjectDeclaration(process.cwd(), "subject-head", {
    releaseVersion: "0.1.0",
    imageDigest: null,
    electronArtifactHash: null,
    environmentId: "ms0-local-unbound",
  }),
  gates: [
    {
      id: "ms0-closeout-not-configured",
      required: true,
      evidenceLevel: "REAL_TEST",
      targetKind: "test",
      requiresArtifactHash: false,
      policyId: "task3.focused-tests",
      skip: true,
    },
  ],
  output: {
    manifestPath: "reports/ms0-repository-constitution/evidence/manifest.json",
    reportPath: "reports/ms0-repository-constitution/evidence/latest.md",
    rawLogDirectory: "reports/ms0-repository-constitution/raw/commands",
  },
};

export default config;
