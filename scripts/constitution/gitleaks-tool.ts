import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildRepositoryWorktreeGitleaksInput } from "./secret-boundary.js";

export type GitleaksPin = {
  readonly version: "8.28.0";
  readonly asset: string;
  readonly checksum: string;
};

export type GitleaksViolation = {
  readonly code:
    | "gitleaks_platform_unsupported"
    | "gitleaks_archive_missing"
    | "gitleaks_binary_missing"
    | "gitleaks_archive_checksum_mismatch"
    | "gitleaks_binary_checksum_mismatch"
    | "gitleaks_version_mismatch";
};

const pins: Readonly<Record<string, GitleaksPin>> = {
  "darwin-arm64": {
    version: "8.28.0",
    asset: "gitleaks_8.28.0_darwin_arm64.tar.gz",
    checksum: "d942f3ad147250c9edbaab3fed9e482f98d3b59ba10ae97b8d75647e3ade492c",
  },
  "darwin-x64": {
    version: "8.28.0",
    asset: "gitleaks_8.28.0_darwin_x64.tar.gz",
    checksum: "edf5a507008b0d2ef4959575772772770586409c1f6f74dabf19cbe7ec341ced",
  },
  "linux-arm64": {
    version: "8.28.0",
    asset: "gitleaks_8.28.0_linux_arm64.tar.gz",
    checksum: "eff65261156100e5d94a6b3dec313d532fddfe19ae1590bf7a2b4f2699128356",
  },
  "linux-x64": {
    version: "8.28.0",
    asset: "gitleaks_8.28.0_linux_x64.tar.gz",
    checksum: "a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb",
  },
};

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function resolveGitleaksPin(platform = process.platform, arch = process.arch): GitleaksPin {
  const pin = pins[`${platform}-${arch}`];
  if (!pin) {
    throw new Error(`gitleaks_platform_unsupported: ${platform}-${arch}`);
  }
  return pin;
}

export function gitleaksInstallPaths(
  repositoryRoot: string,
  platform = process.platform,
  arch = process.arch,
) {
  const pin = resolveGitleaksPin(platform, arch);
  const directory = resolve(repositoryRoot, ".tools", "gitleaks", `v${pin.version}`);
  return {
    directory,
    archive: join(directory, pin.asset),
    binary: join(directory, platform === "win32" ? "gitleaks.exe" : "gitleaks"),
  };
}

export function verifyPinnedGitleaks(
  repositoryRoot: string,
  platform = process.platform,
  arch = process.arch,
): GitleaksViolation[] {
  let pin: GitleaksPin;
  try {
    pin = resolveGitleaksPin(platform, arch);
  } catch {
    return [{ code: "gitleaks_platform_unsupported" }];
  }
  const paths = gitleaksInstallPaths(repositoryRoot, platform, arch);
  const violations: GitleaksViolation[] = [];
  if (!existsSync(paths.archive)) {
    violations.push({ code: "gitleaks_archive_missing" });
  }
  if (!existsSync(paths.binary)) {
    violations.push({ code: "gitleaks_binary_missing" });
  }
  if (!existsSync(paths.archive) || !existsSync(paths.binary)) {
    return violations;
  }
  if (hash(readFileSync(paths.archive)) !== pin.checksum) {
    violations.push({ code: "gitleaks_archive_checksum_mismatch" });
    return violations;
  }

  let archivedBinary: Buffer;
  try {
    archivedBinary = execFileSync("tar", ["-xOf", paths.archive, "gitleaks"], {
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    violations.push({ code: "gitleaks_binary_checksum_mismatch" });
    return violations;
  }
  if (hash(readFileSync(paths.binary)) !== hash(archivedBinary)) {
    violations.push({ code: "gitleaks_binary_checksum_mismatch" });
    return violations;
  }

  const version = execFileSync(paths.binary, ["version"], { encoding: "utf8" }).trim();
  if (version !== pin.version) {
    violations.push({ code: "gitleaks_version_mismatch" });
  }
  return violations;
}

function hasHead(repositoryRoot: string): boolean {
  return (
    spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
      cwd: repositoryRoot,
      stdio: "ignore",
    }).status === 0
  );
}

function gitleaksStatus(binary: string, args: readonly string[], cwd: string): number {
  return (
    spawnSync(binary, [...args], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).status ?? 2
  );
}

function gitleaksUnbornIndexStatus(binary: string, repositoryRoot: string): number {
  const stagedPatch = execFileSync("git", ["diff", "--cached", "--binary", "--no-ext-diff"], {
    cwd: repositoryRoot,
    maxBuffer: 64 * 1024 * 1024,
  });
  return (
    spawnSync(binary, ["stdin", "--redact=100", "--no-banner"], {
      cwd: repositoryRoot,
      input: stagedPatch,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).status ?? 2
  );
}

export function runGitleaksGitScan(
  repositoryRoot: string,
  indexOnly: boolean,
  toolRoot = repositoryRoot,
): boolean {
  const paths = gitleaksInstallPaths(toolRoot);
  if (!indexOnly && hasHead(repositoryRoot)) {
    const historyStatus = gitleaksStatus(
      paths.binary,
      ["git", repositoryRoot, "--log-opts=--all", "--redact=100", "--no-banner"],
      repositoryRoot,
    );
    if (historyStatus !== 0) {
      return false;
    }
  }
  const indexStatus = hasHead(repositoryRoot)
    ? gitleaksStatus(
        paths.binary,
        ["git", repositoryRoot, "--staged", "--redact=100", "--no-banner"],
        repositoryRoot,
      )
    : gitleaksUnbornIndexStatus(paths.binary, repositoryRoot);
  return indexStatus === 0;
}

export function runGitleaksWorktreeScan(
  repositoryRoot: string,
  toolRoot = repositoryRoot,
): boolean {
  const input = buildRepositoryWorktreeGitleaksInput(repositoryRoot);
  if (!input) {
    return false;
  }
  if (input.length === 0) {
    return true;
  }
  const binary = gitleaksInstallPaths(toolRoot).binary;
  return (
    spawnSync(binary, ["stdin", "--redact=100", "--no-banner"], {
      cwd: repositoryRoot,
      input,
      stdio: ["pipe", "pipe", "pipe"],
    }).status === 0
  );
}

export function runGitleaksDirectoryScan(repositoryRoot: string, path: string): boolean {
  const binary = gitleaksInstallPaths(repositoryRoot).binary;
  return gitleaksStatus(binary, ["dir", path, "--redact=100", "--no-banner"], repositoryRoot) === 0;
}
