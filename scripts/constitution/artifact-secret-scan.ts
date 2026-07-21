import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  readlinkSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { scanTextForSecrets } from "./secret-boundary.js";

export type ArtifactSecretViolation = {
  readonly code:
    | "artifact_path_missing"
    | "artifact_symlink_escape"
    | "forbidden_artifact_path"
    | "secret_artifact_violation";
  readonly path: string;
};

const FILE_CHUNK_BYTES = 256 * 1024;
const TEXT_OVERLAP_CHARACTERS = 64 * 1024;
const RAW_OVERLAP_BYTES = TEXT_OVERLAP_CHARACTERS * 2;

function outside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return (
    path === ".." ||
    path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(path)
  );
}

function forbiddenArtifactPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const segments = normalized.split("/");
  const basename = segments.at(-1) ?? "";
  return (
    segments.includes(".local-secrets") ||
    segments.includes(".git") ||
    basename === ".env" ||
    (basename.startsWith(".env.") && basename !== ".env.example") ||
    basename === ".npmrc" ||
    /\.(?:pem|key|p12|pfx)$/iu.test(basename) ||
    /\/reports\/[^/]+\/raw(?:\/|$)/u.test(normalized)
  );
}

function printableUtf16(content: Buffer, littleEndian: boolean, offset: 0 | 1): string {
  let decoded = "";
  let needsSeparator = false;
  for (let index = offset; index + 1 < content.length; index += 2) {
    const first = content[index] ?? 0;
    const second = content[index + 1] ?? 0;
    const codePoint = littleEndian ? first | (second << 8) : (first << 8) | second;
    if (
      codePoint === 9 ||
      codePoint === 10 ||
      codePoint === 13 ||
      (codePoint >= 0x20 && codePoint <= 0x7e)
    ) {
      if (needsSeparator && decoded.length > 0) decoded += "\n";
      decoded += String.fromCharCode(codePoint);
      needsSeparator = false;
    } else {
      needsSeparator = true;
    }
  }
  return decoded;
}

function visitFileChunks(path: string, visit: (chunk: Buffer) => boolean): boolean {
  const descriptor = openSync(path, "r");
  const buffer = Buffer.allocUnsafe(FILE_CHUNK_BYTES);
  try {
    while (true) {
      const bytesRead = readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) return false;
      if (visit(buffer.subarray(0, bytesRead))) return true;
    }
  } finally {
    closeSync(descriptor);
  }
}

function isValidUtf8File(path: string): boolean {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    visitFileChunks(path, (chunk) => {
      decoder.decode(chunk, { stream: true });
      return false;
    });
    decoder.decode();
    return true;
  } catch {
    return false;
  }
}

function scanTextChunk(path: string, text: string, carry: string): [boolean, string] {
  const candidate = carry + text;
  return [
    scanTextForSecrets(path, candidate).length > 0,
    candidate.slice(-TEXT_OVERLAP_CHARACTERS),
  ];
}

function fileContainsSecret(path: string): boolean {
  const utf8Decoder = isValidUtf8File(path) ? new TextDecoder("utf-8", { fatal: true }) : undefined;
  let utf8Carry = "";
  let asciiCarry = "";
  let rawCarry = Buffer.alloc(0);
  const found = visitFileChunks(path, (chunk) => {
    if (utf8Decoder) {
      const [utf8Found, nextCarry] = scanTextChunk(
        path,
        utf8Decoder.decode(chunk, { stream: true }),
        utf8Carry,
      );
      if (utf8Found) return true;
      utf8Carry = nextCarry;
    }

    const [asciiFound, nextAsciiCarry] = scanTextChunk(
      path,
      chunk.toString("latin1").replace(/[^\t\n\r\x20-\x7e]+/gu, "\n"),
      asciiCarry,
    );
    if (asciiFound) return true;
    asciiCarry = nextAsciiCarry;

    const rawWindow = rawCarry.length > 0 ? Buffer.concat([rawCarry, chunk]) : chunk;
    for (const littleEndian of [true, false]) {
      for (const offset of [0, 1] as const) {
        if (scanTextForSecrets(path, printableUtf16(rawWindow, littleEndian, offset)).length > 0) {
          return true;
        }
      }
    }
    rawCarry = Buffer.from(rawWindow.subarray(Math.max(0, rawWindow.length - RAW_OVERLAP_BYTES)));
    return false;
  });
  if (found || !utf8Decoder) return found;
  return scanTextForSecrets(path, utf8Carry + utf8Decoder.decode()).length > 0;
}

function scanOne(root: string, path: string): ArtifactSecretViolation[] {
  if (forbiddenArtifactPath(path)) {
    return [{ code: "forbidden_artifact_path", path }];
  }
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(path);
    const resolvedTarget = resolve(dirname(path), target);
    if (outside(root, resolvedTarget)) {
      return [{ code: "artifact_symlink_escape", path }];
    }
    return scanTextForSecrets(path, target).map(() => ({
      code: "secret_artifact_violation" as const,
      path,
    }));
  }
  if (stat.isDirectory()) {
    return readdirSync(path)
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
      .flatMap((entry) => scanOne(root, join(path, entry)));
  }
  if (!stat.isFile()) {
    return [];
  }
  return fileContainsSecret(path) ? [{ code: "secret_artifact_violation", path }] : [];
}

export function scanArtifactPaths(paths: readonly string[]): ArtifactSecretViolation[] {
  return paths.flatMap((requestedPath) => {
    const path = resolve(requestedPath);
    if (!existsSync(path)) {
      return [{ code: "artifact_path_missing" as const, path }];
    }
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      return [{ code: "artifact_symlink_escape" as const, path }];
    }
    const root = stat.isDirectory() ? path : dirname(path);
    return scanOne(root, path);
  });
}
