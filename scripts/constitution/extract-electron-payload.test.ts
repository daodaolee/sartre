import { describe, expect, it, vi } from "vitest";

import * as constitutionScripts from "./extract-electron-payload.js";

interface ExtractionPlatform {
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

type ParseExtractionArguments = (argv: readonly string[]) => {
  readonly inputPath: string;
  readonly outputPath: string;
};

type ExtractElectronPayload = (
  options: { readonly inputPath: string; readonly outputPath: string },
  platform?: ExtractionPlatform,
) => Promise<void>;

function subjects(): {
  parseExtractionArguments: ParseExtractionArguments;
  extractElectronPayload: ExtractElectronPayload;
} {
  const boundary = constitutionScripts as {
    parseExtractionArguments?: unknown;
    extractElectronPayload?: unknown;
  };
  expect(boundary.parseExtractionArguments).toBeTypeOf("function");
  expect(boundary.extractElectronPayload).toBeTypeOf("function");
  return boundary as {
    parseExtractionArguments: ParseExtractionArguments;
    extractElectronPayload: ExtractElectronPayload;
  };
}

function fakePlatform(overrides: Partial<ExtractionPlatform> = {}): ExtractionPlatform {
  return {
    inputIsRegularFile: vi.fn(async () => true),
    outputIsDirectory: vi.fn(async () => true),
    outputContainsApp: vi.fn(async () => false),
    createMountPoint: vi.fn(async () => "/temporary/mount"),
    attach: vi.fn(async () => undefined),
    listAppPayloads: vi.fn(async () => ["Sartre.app"]),
    copyApp: vi.fn(async () => undefined),
    detach: vi.fn(async () => undefined),
    removeMountPoint: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("Electron DMG payload extractor", () => {
  it("accepts exactly one explicit input/output pair and rejects every ambiguous argv", () => {
    const { parseExtractionArguments } = subjects();
    expect(
      parseExtractionArguments(["--input", "release/Sartre.dmg", "--output", "/tmp/out"]),
    ).toEqual({ inputPath: "release/Sartre.dmg", outputPath: "/tmp/out" });
    for (const argv of [
      [],
      ["--input", "release/Sartre.dmg"],
      ["--output", "/tmp/out"],
      ["--input", "a", "--input", "b", "--output", "/tmp/out"],
      ["--input", "a", "--output", "/tmp/out", "--extra", "value"],
    ]) {
      expect(() => parseExtractionArguments(argv)).toThrow("electron_payload_arguments_invalid");
    }
  });

  it("fails before mounting when input or output containment is invalid", async () => {
    const { extractElectronPayload } = subjects();
    const platform = fakePlatform({ inputIsRegularFile: vi.fn(async () => false) });
    await expect(
      extractElectronPayload({ inputPath: "missing.dmg", outputPath: "/tmp/out" }, platform),
    ).rejects.toThrow("electron_payload_input_missing");
    expect(platform.attach).not.toHaveBeenCalled();
  });

  it("rejects missing or ambiguous app payloads and always detaches and removes its mount", async () => {
    const { extractElectronPayload } = subjects();
    for (const payloads of [[], ["Sartre.app", "Other.app"]]) {
      const platform = fakePlatform({ listAppPayloads: vi.fn(async () => payloads) });
      await expect(
        extractElectronPayload({ inputPath: "Sartre.dmg", outputPath: "/tmp/out" }, platform),
      ).rejects.toThrow("electron_payload_ambiguous");
      expect(platform.detach).toHaveBeenCalledOnce();
      expect(platform.removeMountPoint).toHaveBeenCalledOnce();
      expect(platform.copyApp).not.toHaveBeenCalled();
    }
  });

  it("keeps extraction failed when copy or detach fails and still attempts every cleanup", async () => {
    const { extractElectronPayload } = subjects();
    const platform = fakePlatform({
      copyApp: vi.fn(async () => {
        throw new Error("copy_failed");
      }),
      detach: vi.fn(async () => {
        throw new Error("detach_failed");
      }),
    });
    const error = await extractElectronPayload(
      { inputPath: "Sartre.dmg", outputPath: "/tmp/out" },
      platform,
    ).then(
      () => undefined,
      (failure: unknown) => failure,
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
    expect(platform.removeMountPoint).toHaveBeenCalledOnce();
  });

  it("copies the sole exact Sartre.app and detaches before successful return", async () => {
    const { extractElectronPayload } = subjects();
    const calls: string[] = [];
    const platform = fakePlatform({
      attach: vi.fn(async () => {
        calls.push("attach");
      }),
      copyApp: vi.fn(async (source, destination) => {
        calls.push(`copy:${source}:${destination}`);
      }),
      detach: vi.fn(async () => {
        calls.push("detach");
      }),
      removeMountPoint: vi.fn(async () => {
        calls.push("remove");
      }),
    });
    await extractElectronPayload({ inputPath: "Sartre.dmg", outputPath: "/tmp/out" }, platform);
    expect(calls).toEqual([
      "attach",
      "copy:/temporary/mount/Sartre.app:/tmp/out/Sartre.app",
      "detach",
      "remove",
    ]);
  });
});
