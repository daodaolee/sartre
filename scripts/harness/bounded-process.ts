import { type SpawnSyncOptionsWithStringEncoding, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface BoundedSpawnOptions
  extends Omit<SpawnSyncOptionsWithStringEncoding, "detached" | "killSignal" | "timeout"> {
  readonly timeout: number;
}

function killProcessGroup(pid: number): void {
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
  }
}

export function spawnSyncBounded(
  executable: string,
  args: readonly string[],
  options: BoundedSpawnOptions,
) {
  if (process.platform === "win32") throw new Error("bounded_process_group_unsupported");
  if (!Number.isInteger(options.timeout) || options.timeout < 50) {
    throw new Error("bounded_process_timeout_invalid");
  }
  const controlRoot = mkdtempSync(join(tmpdir(), "sartre-bounded-process-"));
  const pidPath = join(controlRoot, "pgid");
  try {
    const result = spawnSync(
      "/bin/sh",
      [
        "-c",
        'printf "%s" "$$" > "$1"; shift; exec "$@"',
        "sartre-bounded-process",
        pidPath,
        executable,
        ...args,
      ],
      {
        ...options,
        detached: true,
        killSignal: "SIGKILL",
        timeout: options.timeout,
      },
    );
    let processGroupId: number | null = null;
    try {
      const parsed = Number.parseInt(readFileSync(pidPath, "utf8"), 10);
      if (Number.isSafeInteger(parsed) && parsed > 1) processGroupId = parsed;
    } catch {
      processGroupId = null;
    }
    if (processGroupId !== null) killProcessGroup(processGroupId);
    return result;
  } finally {
    rmSync(controlRoot, { recursive: true, force: true });
  }
}
