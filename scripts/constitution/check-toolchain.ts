import { execFileSync } from "node:child_process";
import { resolveGitleaksPin, verifyPinnedGitleaks } from "./gitleaks-tool.js";

const expectedNode = "v24.11.0";
const expectedPnpm = "10.33.2";
const pnpmVersion = execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim();
const violations: string[] = [];
if (process.version !== expectedNode) {
  violations.push("node_version_mismatch");
}
if (pnpmVersion !== expectedPnpm) {
  violations.push("pnpm_version_mismatch");
}
violations.push(...verifyPinnedGitleaks(process.cwd()).map((violation) => violation.code));

for (const violation of violations) {
  console.error(violation);
}
if (violations.length > 0) {
  process.exitCode = 1;
} else {
  console.log(
    `Toolchain verified: Node ${process.version}, pnpm ${pnpmVersion}, gitleaks ${resolveGitleaksPin().version}.`,
  );
}
