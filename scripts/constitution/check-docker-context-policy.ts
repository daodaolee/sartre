import { validateDockerContextPolicy } from "./repository-policy.js";

const violations = validateDockerContextPolicy(process.cwd());
for (const violation of violations) {
  console.error(`${violation.code}: ${violation.path}: ${violation.detail}`);
}
if (violations.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Docker context structural policy passed without enumerating context contents.");
}
