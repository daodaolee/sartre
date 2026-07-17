import {
  runGitleaksGitScan,
  runGitleaksWorktreeScan,
  verifyPinnedGitleaks,
} from "./gitleaks-tool.js";
import { scanRepositoryIndexSecrets, scanRepositorySecrets } from "./secret-boundary.js";

const repositoryRoot = process.cwd();
const indexOnly = process.argv.slice(2).includes("--index");
const toolViolations = verifyPinnedGitleaks(repositoryRoot);
const violations = indexOnly
  ? scanRepositoryIndexSecrets(repositoryRoot)
  : scanRepositorySecrets(repositoryRoot);
const gitScanPassed = toolViolations.length === 0 && runGitleaksGitScan(repositoryRoot, indexOnly);
const worktreeScanPassed =
  indexOnly || (toolViolations.length === 0 && runGitleaksWorktreeScan(repositoryRoot));
const gitleaksPassed = gitScanPassed && worktreeScanPassed;

for (const violation of toolViolations) {
  console.error(violation.code);
}
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${violation.ruleId}: ${violation.path}`);
  }
}
if (!gitleaksPassed && toolViolations.length === 0) {
  console.error("gitleaks_secret_detected");
}
if (toolViolations.length > 0 || violations.length > 0 || !gitleaksPassed) {
  process.exitCode = 1;
} else {
  console.log("Secret boundary check passed.");
}
