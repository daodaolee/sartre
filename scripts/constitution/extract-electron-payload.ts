import { spawn } from "node:child_process";
import { lstat, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_APP_NAME = "Sartre.app";
const COMMAND_TIMEOUT_MS = 120_000;
const TERMINATION_GRACE_MS = 2_000;

export interface ExtractionPlatform {
  inputIsRegularFile: (path: string) => Promise<boolean>;
  outputIsDirectory: (path: string) => Promise<boolean>;
  outputContainsApp: (outputPath: string) => Promise<boolean>;
  createMountPoint: () => Promise<string>;
  attach: (inputPath: string, mountPath: string) => Promise<void>;
  listAppPayloads: (mountPath: string) => Promise<readonly string[]>;
  copyApp: (sourcePath: string, destinationPath: string) => Promise<void>;
  detach: (mountPath: string) => Promise<void>;
  removeMountPoint: (mountPath: string) => Promise<void>;
}

export interface ExtractionArguments {
  readonly inputPath: string;
  readonly outputPath: string;
}

function safeLstat(path: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  return lstat(path).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  });
}

async function runBounded(executable: string, args: readonly string[]): Promise<void> {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(executable, args, {
      env: { PATH: "/usr/bin:/bin" },
      shell: false,
      stdio: "ignore",
    });
    let timedOut = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), TERMINATION_GRACE_MS);
    }, COMMAND_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      if (forceTimer) clearTimeout(forceTimer);
    };
    child.once("error", () => {
      cleanup();
      reject(new Error("electron_payload_command_failed"));
    });
    child.once("exit", (code) => {
      cleanup();
      if (code === 0 && !timedOut) {
        resolveRun();
        return;
      }
      reject(
        new Error(
          timedOut ? "electron_payload_command_timed_out" : "electron_payload_command_failed",
        ),
      );
    });
  });
}

const defaultPlatform: ExtractionPlatform = {
  inputIsRegularFile: async (path) => (await safeLstat(path))?.isFile() === true,
  outputIsDirectory: async (path) => (await safeLstat(path))?.isDirectory() === true,
  outputContainsApp: async (outputPath) =>
    (await safeLstat(join(outputPath, EXPECTED_APP_NAME))) !== undefined,
  createMountPoint: async () => mkdtemp(join(tmpdir(), "sartre-electron-mount.")),
  attach: async (inputPath, mountPath) =>
    runBounded("/usr/bin/hdiutil", [
      "attach",
      inputPath,
      "-readonly",
      "-nobrowse",
      "-mountpoint",
      mountPath,
    ]),
  listAppPayloads: async (mountPath) =>
    (await readdir(mountPath, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
      .map((entry) => entry.name)
      .sort(),
  copyApp: async (sourcePath, destinationPath) =>
    runBounded("/usr/bin/ditto", [sourcePath, destinationPath]),
  detach: async (mountPath) => runBounded("/usr/bin/hdiutil", ["detach", mountPath, "-force"]),
  removeMountPoint: async (mountPath) => rm(mountPath, { recursive: true, force: true }),
};

export function parseExtractionArguments(argv: readonly string[]): ExtractionArguments {
  if (
    argv.length !== 4 ||
    argv[0] !== "--input" ||
    !argv[1] ||
    argv[2] !== "--output" ||
    !argv[3]
  ) {
    throw new Error("electron_payload_arguments_invalid");
  }
  return { inputPath: argv[1], outputPath: argv[3] };
}

export async function extractElectronPayload(
  options: ExtractionArguments,
  platform: ExtractionPlatform = defaultPlatform,
): Promise<void> {
  const inputPath = resolve(options.inputPath);
  const outputPath = resolve(options.outputPath);
  if (!(await platform.inputIsRegularFile(inputPath))) {
    throw new Error("electron_payload_input_missing");
  }
  if (!(await platform.outputIsDirectory(outputPath))) {
    throw new Error("electron_payload_output_invalid");
  }
  if (await platform.outputContainsApp(outputPath)) {
    throw new Error("electron_payload_output_not_empty");
  }

  const mountPath = await platform.createMountPoint();
  let primaryError: unknown;
  let attachAttempted = false;
  try {
    attachAttempted = true;
    await platform.attach(inputPath, mountPath);
    const appPayloads = await platform.listAppPayloads(mountPath);
    if (appPayloads.length !== 1 || appPayloads[0] !== EXPECTED_APP_NAME) {
      throw new Error("electron_payload_ambiguous");
    }
    await platform.copyApp(join(mountPath, EXPECTED_APP_NAME), join(outputPath, EXPECTED_APP_NAME));
  } catch (error) {
    primaryError = error;
  }

  const cleanupErrors: unknown[] = [];
  if (attachAttempted) {
    try {
      await platform.detach(mountPath);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    await platform.removeMountPoint(mountPath);
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (primaryError !== undefined) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError([primaryError, ...cleanupErrors], "electron_payload_extract_failed");
    }
    throw primaryError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, "electron_payload_cleanup_failed");
  }
}

function stableErrorCode(error: unknown): string {
  if (error instanceof Error && /^electron_payload_[a-z_]+$/u.test(error.message)) {
    return error.message;
  }
  return "electron_payload_extract_failed";
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entrypoint === fileURLToPath(import.meta.url)) {
  extractElectronPayload(parseExtractionArguments(process.argv.slice(2))).catch(
    (error: unknown) => {
      console.error(stableErrorCode(error));
      process.exitCode = 1;
    },
  );
}
