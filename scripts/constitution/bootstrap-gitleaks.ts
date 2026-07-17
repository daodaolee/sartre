import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { gitleaksInstallPaths, resolveGitleaksPin, verifyPinnedGitleaks } from "./gitleaks-tool.js";

const repositoryRoot = process.cwd();
const pin = resolveGitleaksPin();
const paths = gitleaksInstallPaths(repositoryRoot);
const response = await fetch(
  `https://github.com/gitleaks/gitleaks/releases/download/v${pin.version}/${pin.asset}`,
);
if (!response.ok) {
  throw new Error(`gitleaks_download_failed: ${response.status}`);
}
const archive = Buffer.from(await response.arrayBuffer());
const checksum = createHash("sha256").update(archive).digest("hex");
if (checksum !== pin.checksum) {
  throw new Error("gitleaks_archive_checksum_mismatch");
}

mkdirSync(paths.directory, { recursive: true, mode: 0o700 });
writeFileSync(paths.archive, archive, { mode: 0o600 });
execFileSync("tar", ["-xzf", paths.archive, "-C", paths.directory, "gitleaks"], {
  stdio: "ignore",
});
chmodSync(paths.binary, 0o700);

const violations = verifyPinnedGitleaks(repositoryRoot);
if (violations.length > 0) {
  throw new Error(violations.map((violation) => violation.code).join(","));
}
console.log(`Pinned gitleaks ${pin.version} installed and checksum-verified.`);
