export const SOURCE_FILE_SUFFIXES = [
  ".d.mts",
  ".d.cts",
  ".d.ts",
  ".mts",
  ".cts",
  ".tsx",
  ".ts",
  ".mjs",
  ".cjs",
  ".jsx",
  ".js",
] as const;

export const EXTENSIONLESS_SOURCE_SUFFIXES = [
  ".ts",
  ".tsx",
  ".d.ts",
  ".mts",
  ".d.mts",
  ".cts",
  ".d.cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

export const IMPORT_EXTENSION_SOURCE_SUFFIXES: Readonly<
  Record<".js" | ".mjs" | ".cjs", readonly string[]>
> = {
  ".js": [".ts", ".tsx", ".d.ts", ".js", ".jsx"],
  ".mjs": [".mts", ".d.mts", ".mjs"],
  ".cjs": [".cts", ".d.cts", ".cjs"],
};

export function isTargetSourceFile(file: string): boolean {
  return SOURCE_FILE_SUFFIXES.some((suffix) => file.endsWith(suffix));
}

export function canonicalSourceCandidatePolicy(requestedPath: string): {
  readonly basePath: string;
  readonly suffixes: readonly string[];
  readonly includeIndex: boolean;
} {
  for (const extension of [".mjs", ".cjs", ".js"] as const) {
    if (requestedPath.endsWith(extension)) {
      return {
        basePath: requestedPath.slice(0, -extension.length),
        suffixes: IMPORT_EXTENSION_SOURCE_SUFFIXES[extension],
        includeIndex: false,
      };
    }
  }
  return isTargetSourceFile(requestedPath)
    ? { basePath: requestedPath, suffixes: [""], includeIndex: false }
    : {
        basePath: requestedPath,
        suffixes: EXTENSIONLESS_SOURCE_SUFFIXES,
        includeIndex: true,
      };
}
