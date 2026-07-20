import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, realpath, rename, unlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export interface AtomicWriteDependencies {
  beforeRename?: () => void | Promise<void>;
}

function isContained(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path);
  return (
    pathFromRoot === "" ||
    (!isAbsolute(pathFromRoot) && pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`))
  );
}

async function assertSafeDirectorySegments(root: string, directory: string): Promise<void> {
  const segments = relative(root, directory).split(sep).filter(Boolean);
  let cursor = root;
  for (const segment of segments) {
    cursor = join(cursor, segment);
    try {
      const stat = await lstat(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("output_path_unsafe");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
      throw error;
    }
  }
}

async function assertSafeFinalPath(path: string): Promise<void> {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("output_path_unsafe");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}

async function syncDirectoryIfSupported(directory: string): Promise<void> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch {
    // Directory fsync is not supported uniformly; the file itself was already fsynced before rename.
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function writeEvidenceAtomically(
  repositoryRoot: string,
  path: string,
  value: string,
  dependencies: AtomicWriteDependencies = {},
): Promise<void> {
  const root = await realpath(resolve(repositoryRoot));
  const lexicalPath = resolve(root, path);
  if (!isContained(root, lexicalPath)) throw new Error("output_path_unsafe");
  const lexicalParent = dirname(lexicalPath);
  await assertSafeDirectorySegments(root, lexicalParent);
  await mkdir(lexicalParent, { recursive: true });
  await assertSafeDirectorySegments(root, lexicalParent);
  const canonicalParent = await realpath(lexicalParent);
  if (!isContained(root, canonicalParent)) throw new Error("output_path_unsafe");

  const finalPath = join(canonicalParent, basename(lexicalPath));
  await assertSafeFinalPath(finalPath);
  const temporaryPath = join(canonicalParent, `.${basename(lexicalPath)}.${randomUUID()}.tmp`);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let renamed = false;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(value);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await dependencies.beforeRename?.();
    await assertSafeFinalPath(finalPath);
    await rename(temporaryPath, finalPath);
    renamed = true;
    await syncDirectoryIfSupported(canonicalParent);
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (!renamed) await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
