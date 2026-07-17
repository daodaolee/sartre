import { validateRepositoryPolicy } from "./repository-policy.js";

const violations = validateRepositoryPolicy(process.cwd());
for (const violation of violations) {
  console.error(`${violation.code}: ${violation.path}: ${violation.detail}`);
}
if (violations.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Repository policy check passed.");
}
