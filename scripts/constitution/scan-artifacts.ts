import { lstatSync } from "node:fs";
import { resolve } from "node:path";
import { scanArtifactPaths } from "./artifact-secret-scan.js";
import { runGitleaksDirectoryScan, verifyPinnedGitleaks } from "./gitleaks-tool.js";

const repositoryRoot = process.cwd();
const paths = process.argv
  .slice(2)
  .filter((path) => path !== "--")
  .map((path) => resolve(path));
if (paths.length === 0) {
  console.error("artifact_path_required");
  process.exitCode = 1;
} else {
  const toolViolations = verifyPinnedGitleaks(repositoryRoot);
  const artifactViolations = scanArtifactPaths(paths);
  const gitleaksFailed = paths.some(
    (path) =>
      lstatSync(path, { throwIfNoEntry: false })?.isDirectory() &&
      !runGitleaksDirectoryScan(repositoryRoot, path),
  );
  for (const violation of toolViolations) {
    console.error(violation.code);
  }
  for (const violation of artifactViolations) {
    console.error(`${violation.code}: ${violation.path}`);
  }
  if (gitleaksFailed) {
    console.error("gitleaks_secret_detected");
  }
  if (toolViolations.length > 0 || artifactViolations.length > 0 || gitleaksFailed) {
    process.exitCode = 1;
  } else {
    console.log(`Artifact Secret boundary passed for ${paths.length} explicit path(s).`);
  }
}
