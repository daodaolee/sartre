import { validateMs0OpenSpec } from "./openspec-validation.js";

const violations = validateMs0OpenSpec(process.cwd());
for (const violation of violations) {
  console.error(`${violation.code}: ${violation.path}`);
}
if (violations.length > 0) {
  process.exitCode = 1;
} else {
  console.log("MS0 OpenSpec validation passed.");
}
