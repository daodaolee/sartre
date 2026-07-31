import { validateOpenSpec } from "./openspec-validation.js";

const violations = validateOpenSpec(process.cwd());
for (const violation of violations) {
  console.error(`${violation.code}: ${violation.path}`);
}
if (violations.length > 0) {
  process.exitCode = 1;
} else {
  console.log("OpenSpec validation passed.");
}
