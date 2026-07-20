import type { HarnessConfig } from "../run-required-gates.js";
import { createRepositorySubjectDeclaration } from "../run-required-gates.js";

const subject = createRepositorySubjectDeclaration(process.cwd(), "subject-head", {
  releaseVersion: "0.1.0",
  imageDigest: null,
  electronArtifactHash: null,
  environmentId: "ms0-negative-missing-command",
});
const subjectKey = `${subject.commitSha}-${subject.dirtyWorktreeHash}`;

const config: HarnessConfig = {
  schemaVersion: "1",
  subject,
  gates: [
    {
      id: "missing-required-command",
      required: true,
      evidenceLevel: "REAL_TEST",
      targetKind: "test",
      requiresArtifactHash: false,
      policyId: "fixture.missing-command",
    },
  ],
  output: {
    manifestPath: `reports/ms0-repository-constitution/raw/fixtures/missing-command/${subjectKey}/manifest.json`,
    reportPath: `reports/ms0-repository-constitution/raw/fixtures/missing-command/${subjectKey}/report.md`,
    rawLogDirectory: "reports/ms0-repository-constitution/raw/commands",
  },
};

export default config;
