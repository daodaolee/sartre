import type { HarnessConfig } from "../run-required-gates.js";
import { createRepositorySubjectDeclaration } from "../run-required-gates.js";

const subject = createRepositorySubjectDeclaration(process.cwd(), "subject-head", {
  releaseVersion: "0.1.0",
  imageDigest: null,
  electronArtifactHash: null,
  environmentId: "ms0-negative-skipped-required",
});
const subjectKey = `${subject.commitSha}-${subject.dirtyWorktreeHash}`;

const config: HarnessConfig = {
  schemaVersion: "1",
  subject,
  gates: [
    {
      id: "skipped-required-gate",
      required: true,
      evidenceLevel: "REAL_TEST",
      targetKind: "test",
      requiresArtifactHash: false,
      policyId: "task3.focused-tests",
      skip: true,
    },
  ],
  output: {
    manifestPath: `reports/ms0-repository-constitution/raw/fixtures/skipped-required/${subjectKey}/manifest.json`,
    reportPath: `reports/ms0-repository-constitution/raw/fixtures/skipped-required/${subjectKey}/report.md`,
    rawLogDirectory: "reports/ms0-repository-constitution/raw/commands",
  },
};

export default config;
